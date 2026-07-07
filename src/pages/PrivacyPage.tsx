import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Volver" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-serif text-2xl font-bold">Política de privacidad</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-sm leading-relaxed">
        <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
          BORRADOR — PENDIENTE DE REVISIÓN LEGAL. Completa los datos del responsable
          y revisa este texto (idealmente con asesoría legal) antes de publicar la app.
        </p>

        <p className="text-muted-foreground">Última actualización: julio de 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">1. Responsable del tratamiento</h2>
          <p>
            ColecScan (en adelante, "la App"). Contacto: [nombre del responsable y
            email de contacto].
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">2. Datos que recogemos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Datos de cuenta:</strong> tu dirección de email y contraseña (cifrada) al registrarte.</li>
            <li><strong>Fotos que escaneas:</strong> las imágenes que capturas o subes se envían a nuestro proveedor de IA para identificar el coleccionable. La foto asociada a un artículo guardado se almacena junto a tu colección.</li>
            <li><strong>Datos de tu colección:</strong> los artículos que guardas, con su identificación y valor estimado.</li>
            <li><strong>Datos de uso del plan:</strong> número de escaneos realizados en el mes, para aplicar los límites del plan gratuito.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">3. Cómo usamos tus datos</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Prestar el servicio: identificar coleccionables, estimar su valor y gestionar tu colección.</li>
            <li>Gestionar tu cuenta y tu plan (gratuito o Premium).</li>
            <li>No vendemos tus datos ni los usamos con fines publicitarios.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">4. Proveedores y encargados</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Supabase</strong>: alojamiento de la base de datos y autenticación.</li>
            <li><strong>Pasarela de IA</strong>: las imágenes escaneadas se procesan con modelos de inteligencia artificial para su identificación.</li>
            <li><strong>Catálogos externos</strong> (Pokémon TCG, Scryfall, YGOPRODeck, Comic Vine, Numista, Discogs): se consultan con los datos del artículo identificado; no reciben tus datos personales.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">5. Conservación y eliminación</h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Puedes eliminar tu
            cuenta y todos tus datos de forma permanente e inmediata desde
            Ajustes → Cuenta → Eliminar cuenta.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">6. Tus derechos</h2>
          <p>
            Puedes ejercer tus derechos de acceso, rectificación, supresión y
            portabilidad escribiendo al contacto indicado en el punto 1.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
