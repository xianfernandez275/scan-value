import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Volver" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-serif text-2xl font-bold">Términos de servicio</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-sm leading-relaxed">
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
          BORRADOR — PENDIENTE DE REVISIÓN LEGAL. Completa los datos del titular
          y revisa este texto (idealmente con asesoría legal) antes de publicar la app.
        </p>

        <p className="text-muted-foreground">Última actualización: julio de 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">1. El servicio</h2>
          <p>
            ColecScan permite fotografiar coleccionables, identificarlos mediante
            inteligencia artificial y consultar una estimación orientativa de su valor,
            así como organizar una colección personal.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">2. Las valoraciones son estimaciones</h2>
          <p>
            <strong>Los valores, precios y tendencias que muestra la App son estimaciones
            orientativas generadas automáticamente y no constituyen una tasación
            profesional, asesoramiento financiero ni una oferta de compra o venta.</strong>{" "}
            La identificación por IA puede contener errores. Verifica siempre con un
            tasador o fuente especializada antes de tomar decisiones económicas.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">3. Tu cuenta</h2>
          <p>
            Eres responsable de la confidencialidad de tus credenciales y del contenido
            que subes. Solo debes escanear imágenes sobre las que tengas derechos.
            Puedes eliminar tu cuenta en cualquier momento desde Ajustes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">4. Planes y pagos</h2>
          <p>
            El plan gratuito incluye un número limitado de escaneos mensuales y artículos
            en la colección. El plan Premium se contrata como suscripción auto-renovable
            a través de la tienda de aplicaciones correspondiente; el cobro, la renovación
            y la cancelación se gestionan según las condiciones de dicha tienda.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">5. Propiedad intelectual</h2>
          <p>
            Las imágenes oficiales y los datos de catálogo proceden de fuentes externas
            (Pokémon TCG, Scryfall, YGOPRODeck, Comic Vine, Numista, Discogs) y pertenecen
            a sus respectivos titulares; se muestran con su atribución correspondiente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">6. Limitación de responsabilidad</h2>
          <p>
            La App se ofrece "tal cual". En la máxima medida permitida por la ley, no nos
            hacemos responsables de pérdidas derivadas de decisiones tomadas a partir de
            las estimaciones mostradas ni de interrupciones del servicio.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">7. Contacto</h2>
          <p>[Nombre del titular y email de contacto.]</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
