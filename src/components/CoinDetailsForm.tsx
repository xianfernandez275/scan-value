import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Globe, Calendar, RotateCcw, Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CoinRefinement {
  country: string;
  year: string;
  face: "obverse" | "reverse" | "";
  denomination: string;
}

interface CoinDetailsFormProps {
  initialName: string;
  initialYear?: number;
  onRefine: (refinement: CoinRefinement) => void;
  onManualSearch: (query: string) => void;
  loading?: boolean;
}

const EURO_COUNTRIES = [
  "Alemania", "Austria", "Bélgica", "Chipre", "Eslovaquia", "Eslovenia",
  "España", "Estonia", "Finlandia", "Francia", "Grecia", "Irlanda",
  "Italia", "Letonia", "Lituania", "Luxemburgo", "Malta", "Mónaco",
  "Países Bajos", "Portugal", "San Marino", "Vaticano",
];

const OTHER_COUNTRIES = [
  "Estados Unidos", "Reino Unido", "Canadá", "Australia", "México",
  "Japón", "China", "Suiza", "Brasil", "Argentina", "Colombia",
  "India", "Sudáfrica", "Rusia", "Turquía",
];

const ALL_COUNTRIES = [...EURO_COUNTRIES, ...OTHER_COUNTRIES].sort();

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 200 }, (_, i) => String(currentYear - i));

const CoinDetailsForm = ({
  initialName,
  initialYear,
  onRefine,
  onManualSearch,
  loading = false,
}: CoinDetailsFormProps) => {
  const [country, setCountry] = useState("");
  const [year, setYear] = useState(initialYear ? String(initialYear) : "");
  const [face, setFace] = useState<"obverse" | "reverse" | "">("");
  const [denomination, setDenomination] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [showManual, setShowManual] = useState(false);

  const handleRefine = () => {
    onRefine({ country, year, face, denomination });
  };

  const handleManualSearch = () => {
    if (manualQuery.trim()) {
      onManualSearch(manualQuery.trim());
    }
  };

  const canRefine = country || year || face;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-4"
    >
      <div className="flex items-start gap-2">
        <Coins size={18} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <h4 className="text-sm font-semibold">Refinar identificación</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Las monedas pueden ser visualmente similares. Añade datos para una identificación precisa.
          </p>
        </div>
      </div>

      {/* Country */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Globe size={12} /> País
        </Label>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecciona el país" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {ALL_COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Calendar size={12} /> Año
        </Label>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecciona el año" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {YEARS.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Face */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <RotateCcw size={12} /> Cara de la moneda
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "obverse" as const, label: "Anverso", desc: "Cara principal" },
            { value: "reverse" as const, label: "Reverso", desc: "Cruz / valor" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFace(face === opt.value ? "" : opt.value)}
              className={`rounded-xl p-3 text-center transition-all border-2 ${
                face === opt.value
                  ? "bg-primary/15 border-primary"
                  : "bg-secondary border-transparent hover:border-primary/30"
              }`}
            >
              <p className={`text-sm font-semibold ${face === opt.value ? "text-primary" : "text-foreground"}`}>
                {opt.label}
              </p>
              <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Denomination (optional) */}
      <div className="space-y-1.5">
        <Label className="text-xs">Denominación (opcional)</Label>
        <Input
          value={denomination}
          onChange={(e) => setDenomination(e.target.value)}
          placeholder="Ej: 1 euro, 50 centavos, 1 dollar"
          className="h-9 text-sm"
          maxLength={50}
        />
      </div>

      {/* Refine button */}
      <Button
        size="sm"
        className="w-full gap-1"
        onClick={handleRefine}
        disabled={!canRefine || loading}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        Refinar identificación
      </Button>

      {/* Manual search toggle */}
      <div className="border-t border-border pt-3">
        <button
          onClick={() => setShowManual(!showManual)}
          className="text-xs text-primary hover:underline"
        >
          {showManual ? "Ocultar búsqueda manual" : "¿No encuentras la moneda? Busca manualmente"}
        </button>

        {showManual && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex gap-2"
          >
            <Input
              value={manualQuery}
              onChange={(e) => setManualQuery(e.target.value)}
              placeholder="Ej: 1 euro España 2002"
              className="h-9 text-sm flex-1"
              maxLength={100}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            />
            <Button size="sm" variant="outline" onClick={handleManualSearch} disabled={!manualQuery.trim() || loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CoinDetailsForm;
