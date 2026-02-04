import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function StockBadge({ quantity, reorderLevel = 10 }) {
  const isLow = quantity <= reorderLevel;
  const isOut = quantity <= 0;
  
  return (
    <Badge 
      variant="secondary"
      className={cn(
        "font-semibold",
        isOut && "bg-rose-100 text-rose-700 border-rose-200",
        isLow && !isOut && "bg-amber-100 text-amber-700 border-amber-200",
        !isLow && "bg-emerald-100 text-emerald-700 border-emerald-200"
      )}
    >
      {quantity}
    </Badge>
  );
}