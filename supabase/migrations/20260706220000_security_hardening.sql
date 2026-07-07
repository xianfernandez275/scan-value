-- Security hardening:
-- 1. Los usuarios no pueden modificar su plan ni su contador de escaneos (solo el backend con service_role).
-- 2. El consumo de escaneos se hace de forma atómica en servidor (consume_scan_credit / refund_scan_credit).
-- 3. El límite de colección del plan free se aplica en servidor, no solo en la UI.
-- 4. collection_items.user_id pasa a ser NOT NULL.

-- ─── 1. Proteger columnas de facturación en profiles ───────────────────────

CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  -- Solo bloqueamos a los roles de la API pública; service_role y el acceso
  -- directo a la BD (migraciones, SQL editor) siguen pudiendo escribir.
  IF jwt_role IN ('authenticated', 'anon') THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.scans_used_this_month IS DISTINCT FROM OLD.scans_used_this_month
       OR NEW.scans_month_reset IS DISTINCT FROM OLD.scans_month_reset THEN
      RAISE EXCEPTION 'plan and scan usage columns can only be modified by the server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_billing ON public.profiles;
CREATE TRIGGER protect_profile_billing
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_billing_columns();

-- ─── 2. Consumo atómico de créditos de escaneo (solo service_role) ─────────

CREATE OR REPLACE FUNCTION public.consume_scan_credit(p_user_id uuid, p_free_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'PROFILE_NOT_FOUND');
  END IF;

  -- Reset mensual del contador (antes se hacía en el cliente)
  IF v_now >= v_profile.scans_month_reset THEN
    v_profile.scans_used_this_month := 0;
    v_profile.scans_month_reset := date_trunc('month', v_now) + interval '1 month';
  END IF;

  IF v_profile.plan <> 'premium' AND v_profile.scans_used_this_month >= p_free_limit THEN
    UPDATE public.profiles
       SET scans_used_this_month = v_profile.scans_used_this_month,
           scans_month_reset = v_profile.scans_month_reset
     WHERE id = p_user_id;
    RETURN jsonb_build_object('allowed', false, 'reason', 'SCAN_LIMIT_REACHED', 'scans_remaining', 0);
  END IF;

  UPDATE public.profiles
     SET scans_used_this_month = v_profile.scans_used_this_month + 1,
         scans_month_reset = v_profile.scans_month_reset
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'scans_remaining',
    CASE WHEN v_profile.plan = 'premium' THEN NULL
         ELSE greatest(0, p_free_limit - (v_profile.scans_used_this_month + 1)) END
  );
END;
$$;

-- Devuelve un crédito cuando la identificación falla tras haberlo consumido
CREATE OR REPLACE FUNCTION public.refund_scan_credit(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET scans_used_this_month = greatest(0, scans_used_this_month - 1)
   WHERE id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.consume_scan_credit(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_scan_credit(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_scan_credit(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_scan_credit(uuid) TO service_role;

-- ─── 3. Límite de colección del plan free aplicado en servidor ─────────────

CREATE OR REPLACE FUNCTION public.enforce_free_collection_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_count integer;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = NEW.user_id;
  IF coalesce(v_plan, 'free') <> 'premium' THEN
    SELECT count(*) INTO v_count FROM public.collection_items WHERE user_id = NEW.user_id;
    IF v_count >= 25 THEN
      RAISE EXCEPTION 'COLLECTION_LIMIT_REACHED'
        USING HINT = 'Free plan allows up to 25 collection items';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_collection_limit ON public.collection_items;
CREATE TRIGGER enforce_free_collection_limit
  BEFORE INSERT ON public.collection_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_collection_limit();

-- ─── 4. user_id obligatorio en collection_items ────────────────────────────
-- Las filas sin user_id son inaccesibles por RLS desde que existen las
-- policies por usuario; se eliminan antes de endurecer la columna.

DELETE FROM public.collection_items WHERE user_id IS NULL;
ALTER TABLE public.collection_items ALTER COLUMN user_id SET NOT NULL;
