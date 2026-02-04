import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Plus, Search, Package, Filter, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import StockBadge from "@/components/stock/StockBadge";
import ProductForm from "@/components/products/ProductForm";

export default function Products() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeletingProduct(null);
    },
  });

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.gpm_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.item_code?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "low") {
      return matchesSearch && (p.master_stock || 0) <= (p.reorder_level || 10);
    }
    if (filter === "active") {
      return matchesSearch && p.status !== "discontinued";
    }
    if (filter === "discontinued") {
      return matchesSearch && p.status === "discontinued";
    }
    return matchesSearch;
  });

  const columns = [
    {
      header: "Product",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.description}</p>
          <p className="text-sm text-slate-500">
            {row.gpm_code && `GPM: ${row.gpm_code}`}
            {row.item_code && ` • Code: ${row.item_code}`}
          </p>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      cell: (row) => <span className="text-slate-600">{row.category || "-"}</span>,
    },
    {
      header: "Master Stock",
      cell: (row) => <StockBadge quantity={row.master_stock || 0} reorderLevel={row.reorder_level || 10} />,
    },
    {
      header: "On Consignment",
      cell: (row) => (
        <span className="font-medium text-violet-700">
          {(row.total_consignment || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Total Owned",
      cell: (row) => (
        <span className="font-semibold text-slate-900">
          {((row.master_stock || 0) + (row.total_consignment || 0)).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Unit Price",
      cell: (row) => row.unit_price ? `KES ${row.unit_price.toLocaleString()}` : "-",
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
            <DropdownMenuItem onClick={() => { setEditingProduct(row); setShowForm(true); }}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-rose-600"
              onClick={() => setDeletingProduct(row)}
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
          title="Products"
          subtitle={`${products.length} products in catalog`}
          actions={
            <Button 
              onClick={() => { setEditingProduct(null); setShowForm(true); }}
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          }
        />

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Products Table */}
        {!isLoading && products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start tracking inventory"
            action={() => { setEditingProduct(null); setShowForm(true); }}
            actionLabel="Add Product"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredProducts}
            isLoading={isLoading}
            emptyMessage="No products match your search"
          />
        )}
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSuccess={() => {
              setShowForm(false);
              setEditingProduct(null);
              queryClient.invalidateQueries({ queryKey: ["products"] });
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingProduct} onOpenChange={() => setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.description}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteMutation.mutate(deletingProduct.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}