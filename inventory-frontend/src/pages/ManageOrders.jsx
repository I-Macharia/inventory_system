import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Search, ShoppingBag, Filter, Eye, Edit } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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

export default function ManageOrders() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingOrder, setEditingOrder] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["allOrders"],
    queryFn: () => base44.entities.Order.list("-created_date", 500),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) => 
      base44.entities.Order.update(orderId, { order_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      setEditingOrder(null);
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ orderId, status }) => 
      base44.entities.Order.update(orderId, { payment_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
    },
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(search.toLowerCase());
    if (statusFilter !== "all") {
      return matchesSearch && order.order_status === statusFilter;
    }
    return matchesSearch;
  });

  const columns = [
    {
      header: "Order #",
      cell: (row) => (
        <div>
          <span className="font-semibold text-slate-900">{row.order_number}</span>
          <p className="text-sm text-slate-500">
            {format(new Date(row.created_date), "MMM d, yyyy")}
          </p>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.customer_name}</p>
          <p className="text-sm text-slate-500">{row.customer_email}</p>
        </div>
      ),
    },
    {
      header: "Items",
      cell: (row) => `${row.items_count} items`,
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
        <Select
          value={row.payment_status}
          onValueChange={(status) => updatePaymentMutation.mutate({ orderId: row.id, status })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge 
          variant="secondary" 
          className={`${ORDER_STATUS_COLORS[row.order_status]} cursor-pointer`}
          onClick={() => setEditingOrder(row)}
        >
          {row.order_status}
        </Badge>
      ),
    },
    {
      header: "",
      cell: (row) => (
        <Link to={createPageUrl("OrderDetail") + `?order_id=${row.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Manage Orders"
          subtitle={`${orders.length} customer orders`}
        />

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by order # or customer..."
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
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!isLoading && orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="Customer orders will appear here"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredOrders}
            isLoading={isLoading}
            emptyMessage="No orders match your search"
          />
        )}

        {/* Update Status Dialog */}
        <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Order Number</p>
                <p className="font-semibold text-slate-900">{editingOrder?.order_number}</p>
              </div>
              <div className="space-y-2">
                <Label>Order Status</Label>
                <Select
                  value={editingOrder?.order_status}
                  onValueChange={(status) => {
                    updateStatusMutation.mutate({ orderId: editingOrder.id, status });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}