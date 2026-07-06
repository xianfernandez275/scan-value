import { useAuth, FREE_SCAN_LIMIT, FREE_COLLECTION_LIMIT } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UsageBannerProps {
  type: "scan" | "collection";
  currentCount?: number;
}

const UsageBanner = ({ type, currentCount }: UsageBannerProps) => {
  const { isPremium, scansUsed, user } = useAuth();
  const navigate = useNavigate();

  if (isPremium || !user) return null;

  const limit = type === "scan" ? FREE_SCAN_LIMIT : FREE_COLLECTION_LIMIT;
  const used = type === "scan" ? scansUsed : (currentCount || 0);
  const percentage = Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  if (!isNearLimit && type === "scan") return null;

  return (
    <div className={`rounded-xl p-3 mb-4 ${isAtLimit ? "bg-destructive/10 border border-destructive/30" : "glass"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {type === "scan" ? "Escaneos este mes" : "Artículos en colección"}
        </span>
        <span className={`text-xs font-bold ${isAtLimit ? "text-destructive" : "text-primary"}`}>
          {used}/{limit}
        </span>
      </div>
      <Progress value={percentage} className="h-1.5" />
      {isAtLimit && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-destructive">
            {type === "scan" ? "Límite alcanzado" : "Colección llena"}
          </span>
          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => navigate("/pricing")}>
            <Zap size={12} /> Upgrade
          </Button>
        </div>
      )}
    </div>
  );
};

export default UsageBanner;
