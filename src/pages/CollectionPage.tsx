import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, TrendingUp, DollarSign, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCollection, removeFromCollection, updateItemNotes, updateItemGrade, type CollectionItem } from "@/lib/api/collection";
import ItemDetailModal from "@/components/ItemDetailModal";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import { getGradeLabel } from "@/components/GradeSelector";
import { useAuth } from "@/contexts/AuthContext";
import UsageBanner from "@/components/UsageBanner";
import { useNavigate } from "react-router-dom";

const CollectionThumbnail = ({ item }: { item: CollectionItem }) => {
  const [imgError, setImgError] = useState(false);
  const src = item.official_image_url || item.user_photo_url;
  const isOfficial = !!item.official_image_url;

  if (!src || imgError) {
    return (
      <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden">
        <CategoryPlaceholder category={item.category} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-secondary">
      <img
        src={src}
        alt={item.name}
        className={`h-full w-full ${isOfficial ? 'object-contain p-0.5' : 'object-cover'}`}
        onError={() => setImgError(true)}
      />
    </div>
  );
};

const CollectionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  useEffect(() => {
    if (user) loadCollection();
    else {
      setCollection([]);
      setLoading(false);
    }
  }, [user]);

  const loadCollection = async () => {
    try {
      const items = await getCollection();
      setCollection(items);
    } catch {
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

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateItemNotes(id, notes);
      setCollection((prev) => prev.map((item) => item.id === id ? { ...item, notes } : item));
      toast.success("Notas guardadas");
    } catch {
      toast.error("Error al guardar notas");
    }
  };

  const handleUpdateGrade = async (id: string, company: string | null, value: string | null) => {
    try {
      await updateItemGrade(id, company, value);
      setCollection((prev) => prev.map((item) => item.id === id ? { ...item, grading_company: company, grading_value: value } : item));
      toast.success("Gradeo actualizado");
    } catch {
      toast.error("Error al actualizar gradeo");
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

      {!user && (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <BookOpen size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground">Inicia sesión para ver tu colección</p>
          <Button onClick={() => navigate("/auth")}>Iniciar Sesión</Button>
        </div>
      )}

      {user && <>
      <UsageBanner type="collection" currentCount={collection.length} />

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
                  className="glass flex items-center gap-3 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Official image thumbnail */}
                  <CollectionThumbnail item={item} />

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
                    <div className="flex gap-1">
                      {(item.grading_company || item.grading_value) && (
                        <Badge variant="secondary" className="text-[9px]">{getGradeLabel(item.grading_company, item.grading_value)}</Badge>
                      )}
                      <Badge variant="outline" className="text-[9px]">{item.rarity}</Badge>
                    </div>
                  </div>
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

      {/* Detail modal */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            allItems={collection}
            onClose={() => setSelectedItem(null)}
            onDelete={handleRemove}
            onUpdateNotes={handleUpdateNotes}
            onUpdateGrade={handleUpdateGrade}
          />
        )}
      </AnimatePresence>
      </>}
    </div>
  );
};

export default CollectionPage;
