import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { format } from "date-fns";
import { Search, TrendingUp, Filter, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/common/pageHeader";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";

const MOVEMENT_TYPES = {
  stock_in: { label: "Stock In", color: "bg-emerald-100 text-emerald-700", icon: ArrowUp },
  dispatch_normal: { label: "Dispatch (Sold)", color: "bg-rose-100 text-rose-700", icon: ArrowDown },
  dispatch_consignment: { label: "Dispatch (Consign)", color: "bg-violet-100 text-violet-700", icon: ArrowDown },
  consignment_sale: { label: "Consignment Sale", color: "bg-blue-100 text-blue-700", icon: TrendingUp },
  adjustment: { label: "Adjustment", color: "bg-amber-100 text-amber-700", icon: RotateCcw },
  return: { label: "Return", color: "bg-slate-100 text-slate-700", icon: RotateCcw },
};

export default function StockMovements() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stockMovements"],
    queryFn: () => base44.entities.StockMovement.list("-created_date", 500),
  });

  const filteredMovements = movements.filter(m => {
    const matchesSearch = 
      m.product_description?.toLowerCase().includes(search.toLowerCase()) ||
      m.product_code?.toLowerCase().includes(search.toLowerCase()) ||
      m.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
      m.shop_name?.toLowerCase().includes(search.toLowerCase());
    
    if (typeFilter !== "all") {
      return matchesSearch && m.movement_type === typeFilter;
    }
    return matchesSearch;
  });

  const columns = [
    {
      header: "Date",
      cell: (row) => (
        <div className="text-sm">
          <p className="font-medium text-slate-900">
            {format(new Date(row.created_date), "MMM d, yyyy")}
          </p>
          <p className="text-slate-500">
            {format(new Date(row.created_date), "h:mm a")}
          </p>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (row) => {
        const type = MOVEMENT_TYPES[row.movement_type] || MOVEMENT_TYPES.adjustment;
        const Icon = type.icon;
        return (
          <Badge variant="secondary" className={`${type.color} flex items-center gap-1 w-fit`}>
            <Icon className="w-3 h-3" />
            {type.label}
          </Badge>
        );
      },
    },
    {
      header: "Product",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.product_description}</p>
          {row.product_code && (
            <p className="text-sm text-slate-500">{row.product_code}</p>
          )}
        </div>
      ),
    },
    {
      header: "Quantity",
      cell: (row) => (
        <Badge 
          variant="secondary" 
          className={row.quantity > 0 
            ? "bg-emerald-100 text-emerald-700 font-semibold" 
            : "bg-rose-100 text-rose-700 font-semibold"
          }
        >
          {row.quantity > 0 ? "+" : ""}{row.quantity}
        </Badge>
      ),
    },
    {
      header: "Reference",
      cell: (row) => (
        <div className="text-sm">
          {row.reference_number && (
            <p className="font-medium text-slate-900">{row.reference_number}</p>
          )}
          <p className="text-slate-500 capitalize">{row.reference_type?.replace(/_/g, " ") || "-"}</p>
        </div>
      ),
    },
    {
      header: "Location",
      cell: (row) => (
        <span className="text-slate-600">{row.shop_name || "Master Store"}</span>
      ),
    },
    {
      header: "Balance After",
      cell: (row) => (
        <span className="font-semibold text-slate-900">
          {row.balance_after !== undefined ? row.balance_after.toLocaleString() : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Stock Movements"
          subtitle="Track all stock ins, outs, and adjustments"
        />

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by product, code, or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Movement Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Movements</SelectItem>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="dispatch_normal">Dispatch (Sold)</SelectItem>
                <SelectItem value="dispatch_consignment">Dispatch (Consignment)</SelectItem>
                <SelectItem value="consignment_sale">Consignment Sale</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!isLoading && movements.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No stock movements yet"
            description="Stock movements will appear here when you receive stock or dispatch invoices"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredMovements}
            isLoading={isLoading}
            emptyMessage="No movements match your search"
          />
        )}
      </div>
    </div>
  );
}