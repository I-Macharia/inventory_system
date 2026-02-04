import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ShoppingBag, Package, Search, Eye, Filter } from "lucide-react";
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

const ORDER_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const PAYMENT_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

export default function MyOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["myOrders", user?.email],
    queryFn: () => base44.entities.Order.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number?.toLowerCase().includes(search.toLowerCase());
    if (statusFilter !== "all") {
      return matchesSearch && order.order_status === statusFilter;
    }
    return matchesSearch;
  });

  const columns = [
    {
      header: "Order #",
      cell: (row) => (
        <span className="font-semibold text-slate-900">{row.order_number}</span>
      ),
    },
    {
      header: "Date",
      cell: (row) => format(new Date(row.created_date), "MMM d, yyyy"),
    },
    {
      header: "Items",
      cell: (row) => (
        <span className="text-slate-600">
          {row.items_count} items ({row.total_quantity} units)
        </span>
      ),
    },
    {
      header: "Total",
      cell: (row) => (
        <span className="font-semibold text-slate-900">
          KES {(row.total_amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Payment",
      cell: (row) => (
        <Badge variant="secondary" className={PAYMENT_STATUS_COLORS[row.payment_status]}>
          {row.payment_status}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge variant="secondary" className={ORDER_STATUS_COLORS[row.order_status]}>
          {row.order_status}
        </Badge>
      ),
    },
    {
      header: "",
      cell: (row) => (
        <Link to={createPageUrl("OrderDetail") + `?order_id=${row.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </Link>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="My Orders"
          subtitle={`${orders.length} orders placed`}
          actions={
            <Link to={createPageUrl("Marketplace")}>
              <Button variant="outline">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
          }
        />

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!isLoading && orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Start shopping to place your first order"
            action={() => window.location.href = createPageUrl("Marketplace")}
            actionLabel="Browse Products"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredOrders}
            isLoading={isLoading}
            emptyMessage="No orders match your search"
          />
        )}
      </div>
    </div>
  );
}