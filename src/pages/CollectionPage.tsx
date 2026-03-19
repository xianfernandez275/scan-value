import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, TrendingUp, DollarSign, Package, Trash2, ExternalLink, ShieldCheck, X, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCollection, removeFromCollection, type CollectionItem } from "@/lib/api/collection";

const CollectionPage = () => {
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    loadCollection();
  }, []);

  const loadCollection = async () => {
    try {
      const items = await getCollection();
      setCollection(items);
    } catch (err: any) {
      toast.error("Error al cargar la colección");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeFromCollection(id);
      setCollection((prev) => prev.filter((item) => item.id !== id));
      toast.success("Artículo eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const totalValue = collection.reduce((sum, item) => sum + (item.estimated_value_usd || 0), 0);

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-serif text-3xl font-bold">
          Mi <span className="text-primary">Colección</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Gestiona y valora tus artículos</p>
      </motion.div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: Package, label: "Artículos", value: collection.length.toString() },
          { icon: DollarSign, label: "Valor Total", value: totalValue >= 1000 ? `$${(totalValue / 1000).toFixed(0)}K` : `$${totalValue}` },
          { icon: TrendingUp, label: "Categorías", value: new Set(collection.map((i) => i.category)).size.toString() },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <Icon size={20} className="mx-auto text-primary" />
              <p className="mt-2 text-lg font-bold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Collection List */}
      <div className="mt-8">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Artículos ({collection.length})
        </h2>

        {loading ? (
          <div className="mt-8 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <AnimatePresence>
              {collection.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl overflow-hidden"
                >
                  {/* Summary row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    {/* Official image thumbnail */}
                    <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-secondary">
                      {item.official_image_url ? (
                        <img
                          src={item.official_image_url}
                          alt={item.name}
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : item.user_photo_url ? (
                        <img
                          src={item.user_photo_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xl">
                          {item.category === 'Cartas' ? '🃏' : item.category === 'Cómics' ? '📚' : item.category === 'Monedas' ? '🪙' : '📦'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.set_or_edition || item.category}
                        {item.catalog_id && ` · ${item.catalog_id}`}
                        {item.variant && ` · ${item.variant}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary text-sm">${(item.estimated_value_usd || 0).toLocaleString()}</p>
                      <Badge variant="outline" className="text-[9px]">{item.rarity}</Badge>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-border px-4 pb-4 pt-3 space-y-4"
                    >
                      {/* Side-by-side images */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tu foto</p>
                          <div className="aspect-[3/4] rounded-lg border border-border overflow-hidden bg-secondary">
                            {item.user_photo_url ? (
                              <img
                                src={item.user_photo_url}
                                alt="Tu foto"
                                className="h-full w-full object-cover cursor-zoom-in"
                                onClick={() => setLightboxSrc(item.user_photo_url)}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ImageOff size={20} className="text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imagen oficial</p>
                          <div className="aspect-[3/4] rounded-lg border border-border overflow-hidden bg-secondary">
                            {item.official_image_url ? (
                              <img
                                src={item.official_image_url}
                                alt={item.name}
                                className="h-full w-full object-contain p-1 cursor-zoom-in"
                                onClick={() => setLightboxSrc(item.official_image_url)}
                              />
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                                <ImageOff size={20} />
                                <p className="text-[9px]">No disponible</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Attribution */}
                      {item.official_image_attribution && (
                        <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-2">
                          <ShieldCheck size={12} className="mt-0.5 shrink-0 text-green-400" />
                          <div>
                            <p className="text-[9px] text-muted-foreground">{item.official_image_attribution}</p>
                            {item.official_set_name && (
                              <p className="text-[9px] text-muted-foreground">{item.official_set_name} · #{item.official_card_number} · ID: {item.official_card_id}</p>
                            )}
                            {item.official_image_source_url && (
                              <a href={item.official_image_source_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                                <ExternalLink size={7} /> {item.official_image_source}
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <p className="text-xs text-muted-foreground">{item.description}</p>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-secondary p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Condición</p>
                          <p className="text-xs font-semibold">{item.condition_estimate}</p>
                        </div>
                        <div className="rounded-lg bg-secondary p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Año</p>
                          <p className="text-xs font-semibold">{item.year}</p>
                        </div>
                        <div className="rounded-lg bg-secondary p-2 text-center">
                          <p className="text-[9px] text-muted-foreground">Confianza</p>
                          <p className="text-xs font-semibold">{Math.round((item.confidence || 0) * 100)}%</p>
                        </div>
                      </div>

                      {item.special_features && item.special_features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.special_features.map((f) => (
                            <span key={f} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{f}</span>
                          ))}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full gap-1"
                        onClick={() => handleRemove(item.id)}
                      >
                        <Trash2 size={14} /> Eliminar de colección
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && collection.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <BookOpen size={48} className="text-muted-foreground" />
            <p className="text-muted-foreground">Tu colección está vacía</p>
            <p className="text-sm text-muted-foreground">Escanea un artículo para empezar</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
            onClick={() => setLightboxSrc(null)}
          >
            <button onClick={() => setLightboxSrc(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={lightboxSrc}
              alt="Ampliación"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CollectionPage;
