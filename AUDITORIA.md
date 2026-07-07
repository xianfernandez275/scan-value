# Auditoría de ColecScan (scan-value)

**Fecha:** 2026-07-06 · **Objetivo:** completar el desarrollo en Replit y lanzar en la App Store de Apple.

ColecScan es una app web (Vite + React 18 + TypeScript + shadcn/Radix + Tailwind + Supabase, generada con Lovable) que identifica coleccionables con IA (Gemini vía Lovable AI Gateway) y estima su valor consultando catálogos externos (Pokémon TCG, Scryfall, YGOPRODeck, Comic Vine, Numista, Discogs).

Este documento recoge **todos los hallazgos de la auditoría** priorizados, indica cuáles ya quedaron corregidos en esta rama, y define el **roadmap de lanzamiento** en la App Store.

---

## 1. Hallazgos críticos (bloquean el lanzamiento)

### 1.1 La monetización era completamente evadible — ✅ CORREGIDO EN ESTA RAMA

- El límite de 10 escaneos gratis se contaba **solo en el navegador** (`src/contexts/AuthContext.tsx`): bastaba con no llamar a `incrementScanCount` o llamar a la edge function directamente.
- `identify-collectible` estaba con `verify_jwt = false` en `supabase/config.toml`: **cualquiera en internet podía invocarla anónimamente** y quemar tus créditos de IA sin límite (riesgo de coste directo).
- La policy RLS de `profiles` permitía a cualquier usuario ejecutar desde la consola del navegador
  `supabase.from('profiles').update({ plan: 'premium', scans_used_this_month: 0 })` y **auto-asignarse Premium gratis**.

**Corrección aplicada:**
- Migración `supabase/migrations/20260706220000_security_hardening.sql`:
  - Trigger que bloquea cambios de `plan`, `scans_used_this_month` y `scans_month_reset` salvo para `service_role` (el backend). El usuario ya no puede tocar su plan ni su contador.
  - Función atómica `consume_scan_credit()` (solo ejecutable por `service_role`) que resetea el mes, valida el límite e incrementa el contador en una sola operación con bloqueo de fila.
  - Límite de colección free (25 ítems) aplicado con trigger en servidor (antes solo se mostraba en la UI y no se aplicaba).
  - `collection_items.user_id` ahora es `NOT NULL`.
- `supabase/config.toml`: `verify_jwt = true` en `identify-collectible`, `search-collectible-image` y `api-health-check`.
- `identify-collectible` ahora **valida el usuario del JWT y consume el crédito en servidor** antes de llamar a la IA (devuelve 401 sin sesión y 403 con `SCAN_LIMIT_REACHED` al agotar la cuota). Si la IA falla, devuelve el crédito.
- El frontend ya no escribe el contador: lo relee del servidor tras cada escaneo.

> ⚠️ **Acción tuya pendiente:** aplicar la migración en Supabase (`supabase db push` o pegarla en el SQL Editor) y redesplegar las edge functions (`supabase functions deploy identify-collectible delete-account`). Hasta entonces, producción sigue vulnerable.

### 1.2 No es una app nativa — ⚙️ BASE AÑADIDA EN ESTA RAMA

Apple no acepta webs en la App Store: necesita un contenedor nativo. Se añadió **Capacitor** (`capacitor.config.ts` + proyecto `ios/`). El build final requiere macOS con Xcode o un servicio de build en la nube (Codemagic, Ionic Appflow) porque Replit es Linux. Ver roadmap §4.

### 1.3 Pagos: no existe pasarela — ❌ PENDIENTE (decisión tomada: RevenueCat + IAP)

- `PricingPage.tsx` anuncia Premium a $9.99/mes con "7 días de prueba", pero el botón solo muestra un toast "Próximamente". No hay Stripe, ni RevenueCat, ni nada.
- **Regla de Apple (guideline 3.1.1):** las suscripciones digitales dentro de una app iOS deben cobrarse con compras In-App de Apple. No puedes meter un checkout de Stripe en la app.
- **Camino elegido:** RevenueCat (SDK `@revenuecat/purchases-capacitor`) + productos de suscripción en App Store Connect + webhook de RevenueCat → edge function que actualiza `profiles.plan` con service role (la única vía permitida ahora por el trigger de seguridad). Pasos concretos en §4.

### 1.4 Requisitos legales de Apple — ⚙️ PARCIALMENTE RESUELTO EN ESTA RAMA

- **Borrado de cuenta (guideline 5.1.1(v), obligatorio):** "Eliminar cuenta" solo mostraba un toast falso. Ahora existe la edge function `delete-account` que borra el usuario y todos sus datos (perfil y colección en cascada), conectada a Ajustes.
- **Política de privacidad y términos:** eran "Próximamente". Se añadieron `/privacy` y `/terms` con borradores **marcados como PENDIENTES DE REVISIÓN LEGAL — debes revisarlos (idealmente con un abogado) y completar los datos del responsable antes de enviar a Apple.** Apple además exige la URL de privacidad en App Store Connect y el formulario "App Privacy" (datos que recoges: email, fotos procesadas, identificadores).

---

## 2. Hallazgos de riesgo alto (arreglar antes o justo después del lanzamiento)

### 2.1 Valoraciones y gráficos inventados — riesgo legal/reputacional

- `ScanResultModal.tsx` genera el **historial de precios con `Math.random()`** y las predicciones "en 6 meses / 1 año" son multiplicadores fijos (`×1.12`, `×1.25`). Min/max de mercado hacen fallback a `×0.7`/`×1.4`.
- `search-collectibles` y `market-prices` piden al LLM "precios realistas": son **precios inventados por la IA**, no datos de mercado.
- Una app que "tasa" coleccionables con datos falsos puede generar reclamaciones y reviews de 1 estrella, y Apple puede rechazarla por "misleading content".
- **Recomendación:** (a) corto plazo, eliminar el gráfico aleatorio y las predicciones, y etiquetar todo valor como "estimación orientativa, no es una tasación"; (b) medio plazo, usar precios reales (TCGplayer/Cardmarket vía pokemontcg.io y Scryfall ya devuelven precios; eBay Browse API para el resto).

### 2.2 Fotos de usuario en base64 dentro de Postgres

`src/lib/api/collection.ts` guarda `user_photo_url` como data-URI base64 en la tabla (comentario en el código: "will use storage later"). Filas de varios MB encarecen y ralentizan la BD. **Recomendación:** bucket privado de Supabase Storage + política por usuario + guardar solo el path.

### 2.3 CORS abierto (`*`) en todas las edge functions

Con `verify_jwt=true` el riesgo baja mucho, pero conviene restringir. `identify-collectible` ya soporta la variable de entorno `ALLOWED_ORIGINS` (lista separada por comas; incluye `capacitor://localhost` para la app iOS). Configúrala en Supabase → Edge Functions → Secrets cuando conozcas el dominio de producción, y replica el patrón en las demás funciones.

---

## 3. Hallazgos medios y bajos

| Hallazgo | Detalle | Recomendación |
|---|---|---|
| `.env` versionado | Contenía solo la clave anon (pública por diseño), pero es mala práctica | ✅ Añadido a `.gitignore`. En Replit usa Secrets; el `.env` histórico no expone nada sensible |
| Claves de API en URLs de logs | Comic Vine viaja como query param y se logueaba | ✅ Los logs ahora redactan `api_key`/`token` |
| Código muerto | `/results` (`ResultsPage.tsx`, ~344 líneas, `scanStore.setScanData` nunca se llama) e `Index.tsx` huérfano | Borrar en Replit |
| Datos mock en producción | `HomePage`, `MarketPage`, `SearchPage` usan `src/lib/mockData.ts` | Sustituir por datos reales o eliminar secciones |
| i18n y moneda no funcionales | El selector Español/English y USD/EUR de Ajustes no cambia nada | Quitar los selectores o implementar i18next + conversión; no lances con controles que no hacen nada (Apple lo detecta) |
| Tests placeholder | `example.test.ts` es `expect(true).toBe(true)`; Playwright sin specs | Añadir tests del flujo de escaneo y de cuota |
| Accesibilidad | Botones solo-icono sin `aria-label` (cerrar imagen, toggle contraseña) | Añadir `aria-label`; Apple valora accesibilidad |
| Contraseña mínima 6 caracteres | `AuthPage.tsx` | Subir a 8+ y activar protección de contraseñas filtradas en Supabase Auth |
| Sin OAuth | Solo email/contraseña | **Ojo:** si añades "Sign in with Google", Apple obliga a ofrecer también "Sign in with Apple" (guideline 4.8) |
| `<html lang="en">`, metadatos de Lovable, 404 en inglés | `index.html`, `NotFound.tsx` | ✅ Corregido en esta rama |

---

## 4. Roadmap de lanzamiento en App Store (orden recomendado)

### Fase A — En Replit (terminar el producto)
1. **Aplicar la migración y redesplegar funciones** (ver §1.1) y probar: escanear hasta agotar la cuota free → debe aparecer el aviso y bloquearse en servidor.
2. Configurar Secrets en Replit (los valores de `.env`) y en Supabase (`ALLOWED_ORIGINS`).
3. Quitar datos inventados (§2.1), borrar código muerto, decidir i18n/moneda.
4. Migrar fotos a Supabase Storage (§2.2).
5. Revisar y completar `/privacy` y `/terms` (responsable, contacto, jurisdicción).

### Fase B — Pagos (RevenueCat + In-App Purchases)
1. Cuenta **Apple Developer Program** ($99/año) y app en App Store Connect (bundle ID `com.colecscan.app`).
2. Crear la suscripción auto-renovable "Premium mensual" ($9.99, con prueba de 7 días como oferta introductoria) en App Store Connect.
3. Cuenta RevenueCat, instalar `@revenuecat/purchases-capacitor`, configurar el entitlement `premium`.
4. Edge function `revenuecat-webhook`: recibe eventos de compra/renovación/cancelación y actualiza `profiles.plan` con service role (el trigger de seguridad ya solo permite esta vía).
5. En `PricingPage`, sustituir el toast por `Purchases.purchasePackage(...)` cuando corre en Capacitor; en web puedes mantener "disponible en la app iOS" o añadir Stripe **solo web** más adelante.

### Fase C — Build iOS y envío
1. En un Mac (o Codemagic/Ionic Appflow desde el repo): `npm run build && npx cap sync ios`, abrir `ios/App` en Xcode, firmar con tu equipo.
2. Añadir en Xcode la descripción de uso de cámara (`NSCameraUsageDescription`) y de fotos (`NSPhotoLibraryUsageDescription`) — la app usa `<input capture>`, WKWebView las exige.
3. Icono 1024px, splash, capturas de pantalla (6.7" y 6.5" mínimo), textos de la ficha.
4. Formulario **App Privacy** (email de cuenta, fotos procesadas por IA, sin tracking) + URL de privacidad.
5. TestFlight con testers reales → corregir → enviar a revisión.

### Checklist rápido de App Review
- [ ] Compra In-App funcional y restaurable ("Restaurar compras" visible)
- [ ] Borrado de cuenta accesible en la app (ya implementado)
- [ ] Política de privacidad enlazada y URL en App Store Connect
- [ ] Sin botones "Próximamente" ni controles que no hacen nada
- [ ] Sin referencias a pagos externos dentro de la app iOS
- [ ] Permisos de cámara/fotos con textos claros en español
- [ ] La app funciona sin conexión al menos con un mensaje claro de error
- [ ] Cuenta demo para el revisor de Apple (email+contraseña en las notas de revisión)

---

## 5. Cambios incluidos en esta rama

| Área | Cambio |
|---|---|
| `AUDITORIA.md` | Este informe |
| `supabase/migrations/20260706220000_security_hardening.sql` | Protección de columnas de plan, RPC `consume_scan_credit`, límite de colección en servidor, `user_id NOT NULL` |
| `supabase/config.toml` | `verify_jwt = true` en las tres funciones que estaban abiertas |
| `supabase/functions/identify-collectible/index.ts` | Autenticación del usuario, consumo de crédito en servidor, redacción de claves en logs, CORS configurable |
| `supabase/functions/delete-account/index.ts` | Borrado real de cuenta (GDPR / guideline 5.1.1) |
| `src/contexts/AuthContext.tsx`, `src/pages/ScanPage.tsx`, `src/lib/api/identifyCollectible.ts` | El cliente ya no gestiona la cuota; maneja los nuevos errores 401/403 |
| `src/pages/SettingsPage.tsx` | Borrado de cuenta real + enlaces legales |
| `src/pages/PrivacyPage.tsx`, `src/pages/TermsPage.tsx`, `src/App.tsx` | Páginas legales (borrador) |
| `capacitor.config.ts`, `ios/`, `package.json` | Base Capacitor iOS + scripts `cap:sync` / `cap:ios` |
| `index.html`, `src/pages/NotFound.tsx`, `.gitignore` | `lang="es"`, sin metadatos de Lovable, 404 en español, `.env` ignorado |
