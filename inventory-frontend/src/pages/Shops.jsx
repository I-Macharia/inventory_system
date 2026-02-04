import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Plus, Search, Store, MoreHorizontal, Pencil, Trash2, Package, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/common/pageHeader";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import ShopTypeBadge from "@/components/shop/ShopTypeBadge";
import ShopForm from "@/components/shop/ShopForm";
import { Badge } from "@/components/ui/badge";

export default function Shops() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [deletingShop, setDeletingShop] = useState(null);

  const queryClient = useQueryClient();

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["shops"],
    queryFn: () => base44.entities.Shop.list("-created_date", 100),
  });

  const { data: consignmentStock = [] } = useQuery({
    queryKey: ["consignmentStock"],
    queryFn: () => base44.entities.ConsignmentStock.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Shop.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      setDeletingShop(null);
    },
  });

  // Calculate consignment totals per shop
  const shopConsignmentTotals = consignmentStock.reduce((acc, item) => {
    acc[item.shop_id] = (acc[item.shop_id] || 0) + (item.quantity || 0);
    return acc;
  }, {});

  const filteredShops = shops.filter(s => {
    const matchesSearch = s.name?.toLowerCase().includes(search.toLowerCase());
    if (filter === "normal") return matchesSearch && s.type === "normal";
    if (filter === "consignment") return matchesSearch && s.type === "consignment";
    if (filter === "active") return matchesSearch && s.status === "active";
    return matchesSearch;
  });

  const columns = [
    {
      header: "Shop Name",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          {row.address && <p className="text-sm text-slate-500">{row.address}</p>}
        </div>
      ),
    },
    {
      header: "Type",
      cell: (row) => <ShopTypeBadge type={row.type} />,
    },
    {
      header: "Contact",
      cell: (row) => (
        <div className="text-sm">
          {row.contact_person && <p className="text-slate-900">{row.contact_person}</p>}
          {row.phone && <p className="text-slate-500">{row.phone}</p>}
        </div>
      ),
    },
    {
      header: "Stock at Shop",
      cell: (row) => {
        if (row.type !== "consignment") return <span className="text-slate-400">N/A</span>;
        const total = shopConsignmentTotals[row.id] || 0;
        return (
          <Badge variant="secondary" className="bg-violet-100 text-violet-700">
            <Package className="w-3 h-3 mr-1" />
            {total.toLocaleString()} units
          </Badge>
        );
      },
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge 
          variant="secondary"
          className={row.status === "active" 
            ? "bg-emerald-100 text-emerald-700" 
            : "bg-slate-100 text-slate-600"
          }
        >
          {row.status || "active"}
        </Badge>
      ),
    },
    {
      header: "",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.type === "consignment" && (
              <DropdownMenuItem asChild>
                <Link to={createPageUrl("ShopStock") + `?shop_id=${row.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Stock
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { setEditingShop(row); setShowForm(true); }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-rose-600"
              onClick={() => setDeletingShop(row)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: "w-12",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Shops"
          subtitle={`${shops.length} registered shops`}
          actions={
            <Button 
              onClick={() => { setEditingShop(null); setShowForm(true); }}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shop
            </Button>
          }
        />

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search shops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shops</SelectItem>
                <SelectItem value="normal">Normal (Direct Sale)</SelectItem>
                <SelectItem value="consignment">Consignment</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!isLoading && shops.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No shops yet"
            description="Add your first shop to start tracking deliveries"
            action={() => { setEditingShop(null); setShowForm(true); }}
            actionLabel="Add Shop"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredShops}
            isLoading={isLoading}
            emptyMessage="No shops match your search"
          />
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingShop ? "Edit Shop" : "Add New Shop"}
            </DialogTitle>
          </DialogHeader>
          <ShopForm
            shop={editingShop}
            onSuccess={() => {
              setShowForm(false);
              setEditingShop(null);
              queryClient.invalidateQueries({ queryKey: ["shops"] });
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingShop} onOpenChange={() => setDeletingShop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingShop?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteMutation.mutate(deletingShop.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}