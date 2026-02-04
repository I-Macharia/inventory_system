import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Store, Package } from "lucide-react";

export default function ShopTypeBadge({ type }) {
  const isConsignment = type === "consignment";
  
  return (
    <Badge 
      variant="secondary"
      className={cn(
        "font-medium flex items-center gap-1.5",
        isConsignment 
          ? "bg-violet-100 text-violet-700 border-violet-200" 
          : "bg-sky-100 text-sky-700 border-sky-200"
      )}
    >
      {isConsignment ? <Package className="w-3 h-3" /> : <Store className="w-3 h-3" />}
      {isConsignment ? "Consignment" : "Normal"}
    </Badge>
  );
}