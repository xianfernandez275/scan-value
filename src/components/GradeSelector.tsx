import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

export interface GradeSelection {
  company: string | null;  // null = raw/ungraded
  value: string | null;
}

interface GradeSelectorProps {
  value: GradeSelection;
  onChange: (grade: GradeSelection) => void;
  compact?: boolean;
}

const GRADING_OPTIONS = [
  {
    company: null,
    label: "Sin Gradear",
    values: [
      { value: "mint", label: "Mint", multiplier: 0.85 },
      { value: "near-mint", label: "Near Mint", multiplier: 0.7 },
      { value: "excellent", label: "Excellent", multiplier: 0.55 },
      { value: "good", label: "Good", multiplier: 0.4 },
      { value: "played", label: "Played", multiplier: 0.25 },
      { value: "poor", label: "Poor", multiplier: 0.1 },
    ],
  },
  {
    company: "PSA",
    label: "PSA",
    values: [
      { value: "10", label: "Gem Mint 10", multiplier: 1.0 },
      { value: "9", label: "Mint 9", multiplier: 0.6 },
      { value: "8", label: "NM-MT 8", multiplier: 0.35 },
      { value: "7", label: "NM 7", multiplier: 0.22 },
      { value: "6", label: "EX-MT 6", multiplier: 0.15 },
      { value: "5", label: "EX 5", multiplier: 0.1 },
    ],
  },
  {
    company: "BGS",
    label: "BGS / Beckett",
    values: [
      { value: "10", label: "Pristine 10", multiplier: 1.2 },
      { value: "9.5", label: "Gem Mint 9.5", multiplier: 0.95 },
      { value: "9", label: "Mint 9", multiplier: 0.55 },
      { value: "8.5", label: "NM-MT+ 8.5", multiplier: 0.35 },
      { value: "8", label: "NM-MT 8", multiplier: 0.28 },
    ],
  },
  {
    company: "CGC",
    label: "CGC",
    values: [
      { value: "10", label: "Pristine 10", multiplier: 1.1 },
      { value: "9.5", label: "Gem Mint 9.5", multiplier: 0.85 },
      { value: "9", label: "Mint 9", multiplier: 0.5 },
      { value: "8.5", label: "NM-MT+ 8.5", multiplier: 0.32 },
      { value: "8", label: "NM-MT 8", multiplier: 0.25 },
    ],
  },
];

/** Returns a price multiplier (0-1.2) for a given grade. 1.0 = PSA 10 baseline. */
export function getGradeMultiplier(company: string | null, value: string | null): number {
  if (!value) return 0.5; // raw, unknown condition
  const group = GRADING_OPTIONS.find((g) => g.company === company);
  if (!group) return 0.5;
  const opt = group.values.find((v) => v.value === value);
  return opt?.multiplier ?? 0.5;
}

/** Returns a human-readable label for a grade. */
export function getGradeLabel(company: string | null, value: string | null): string {
  if (!value && !company) return "Sin gradear";
  if (!value) return company || "Sin gradear";
  if (!company) {
    const raw = GRADING_OPTIONS[0].values.find((v) => v.value === value);
    return raw?.label || value;
  }
  return `${company} ${value}`;
}

const GradeSelector = ({ value, onChange, compact = false }: GradeSelectorProps) => {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(
    value.company !== undefined ? value.company : null
  );

  const currentGroup = GRADING_OPTIONS.find((g) => g.company === selectedCompany) || GRADING_OPTIONS[0];

  const handleSelectCompany = (company: string | null) => {
    setSelectedCompany(company);
    onChange({ company, value: null });
  };

  const handleSelectValue = (val: string) => {
    onChange({ company: selectedCompany, value: val });
  };

  const currentLabel = getGradeLabel(value.company, value.value);

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between rounded-xl bg-secondary p-3 transition-colors hover:bg-secondary/80"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gradeo</p>
            <p className="text-sm font-semibold">{currentLabel}</p>
          </div>
        </div>
        <ChevronDown size={16} className="text-muted-foreground" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary" />
          <div>
            <h4 className="text-sm font-semibold">Estado / Gradeo</h4>
            <p className="text-[10px] text-muted-foreground">Selecciona la condición del artículo</p>
          </div>
        </div>
        {compact && (
          <button onClick={() => setExpanded(false)}>
            <ChevronUp size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Company tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {GRADING_OPTIONS.map((group) => (
          <button
            key={group.label}
            onClick={() => handleSelectCompany(group.company)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              selectedCompany === group.company
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* Grade values grid */}
      <div className="grid grid-cols-3 gap-2">
        {currentGroup.values.map((opt) => {
          const isSelected = value.company === selectedCompany && value.value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelectValue(opt.value)}
              className={`relative rounded-xl p-3 text-center transition-all ${
                isSelected
                  ? "bg-primary/15 border-2 border-primary ring-1 ring-primary/30"
                  : "bg-secondary border-2 border-transparent hover:border-primary/30"
              }`}
            >
              <p className={`text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                {selectedCompany ? opt.value : ""}
              </p>
              <p className={`text-[10px] mt-0.5 ${isSelected ? "text-primary/80" : "text-muted-foreground"}`}>
                {opt.label}
              </p>
            </button>
          );
        })}
      </div>

      {value.value && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2"
        >
          <ShieldCheck size={14} className="text-primary" />
          <p className="text-xs font-medium text-primary">{currentLabel}</p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default GradeSelector;
