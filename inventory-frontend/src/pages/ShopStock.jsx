import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Store, 
  Package, 
  Search,
  DollarSign,
  Loader2,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/pageHeader";

export default function ShopStock() {
  const params = new URLSearchParams(window.location.search);
  const shopId = params.get("shop_id");
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleQuantities, setSaleQuantities] = useState({});

  const { data: shop, isLoading: loadingShop } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: () => base44.entities.Shop.filter({ id: shopId }),
    select: (data) => data[0],
    enabled: !!shopId,
  });

  const { data: consignmentStock = [], isLoading: loadingStock } = useQuery({
    queryKey: ["consignmentStock", shopId],
    queryFn: () => base44.entities.ConsignmentStock.filter({ shop_id: shopId }),
    enabled: !!shopId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const filteredStock = consignmentStock.filter(item =>
    item.product_description?.toLowerCase().includes(search.toLowerCase()) ||
    item.product_code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnits = consignmentStock.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Calculate total value
  const totalValue = consignmentStock.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + ((item.quantity || 0) * (product?.unit_price || 0));
  }, 0);

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === filteredStock.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredStock.map(item => item.id));
    }
  };

  const openSaleDialog = () => {
    const quantities = {};
    selectedItems.forEach(id => {
      const item = consignmentStock.find(i => i.id === id);
      if (item) {
        quantities[id] = item.quantity;
      }
    });
    setSaleQuantities(quantities);
    setShowSaleDialog(true);
  };

  const recordSaleMutation = useMutation({
    mutationFn: async () => {
      for (const itemId of selectedItems) {
        const item = consignmentStock.find(i => i.id === itemId);
        if (!item) continue;

        const soldQty = saleQuantities[itemId] || 0;
        if (soldQty <= 0) continue;

        const product = products.find(p => p.id === item.product_id);
        const remainingQty = (item.quantity || 0) - soldQty;

        // Update consignment stock
        if (remainingQty <= 0) {
          await base44.entities.ConsignmentStock.delete(item.id);
        } else {
          await base44.entities.ConsignmentStock.update(item.id, {
            quantity: remainingQty,
          });
        }

        // Update product totals
        if (product) {
          await base44.entities.Product.update(product.id, {
            total_consignment: Math.max(0, (product.total_consignment || 0) - soldQty),
            total_sold: (product.total_sold || 0) + soldQty,
          });
        }

        // Record stock movement
        await base44.entities.StockMovement.create({
          product_id: item.product_id,
          product_code: item.product_code,
          product_description: item.product_description,
          movement_type: "consignment_sale",
          quantity: -soldQty,
          reference_type: "sale_report",
          shop_id: shop.id,
          shop_name: shop.name,
          notes: `Consignment sale at ${shop.name}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      setShowSaleDialog(false);
      setSelectedItems([]);
      setSaleQuantities({});
    },
  });

  if (loadingShop) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-32 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!shop || shop.type !== "consignment") {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto text-center py-20">
          <Store className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {shop ? "Not a consignment shop" : "Shop not found"}
          </h2>
          <p className="text-slate-500 mb-6">
            {shop 
              ? "Stock tracking is only available for consignment shops."
              : "The shop you're looking for doesn't exist."
            }
          </p>
          <Link to={createPageUrl("Shops")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shops
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Shops")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shops
          </Link>
        </div>

        <PageHeader
          title={shop.name}
          subtitle="Consignment stock at this location"
          actions={
            selectedItems.length > 0 && (
              <Button onClick={openSaleDialog} className="bg-emerald-600 hover:bg-emerald-700">
                <DollarSign className="w-4 h-4 mr-2" />
                Record Sale ({selectedItems.length})
              </Button>
            )
          }
        />

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100">
                <Package className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Units</p>
                <p className="text-2xl font-bold text-slate-900">{totalUnits.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Store className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Products</p>
                <p className="text-2xl font-bold text-slate-900">{consignmentStock.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">KES {totalValue.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Stock Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.length === filteredStock.length && filteredStock.length > 0}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingStock ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    {search ? "No products match your search" : "No stock at this location"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStock.map((item) => {
                  const product = products.find(p => p.id === item.product_id);
                  const unitPrice = product?.unit_price || 0;
                  const value = (item.quantity || 0) * unitPrice;
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleItemSelection(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.product_description}</TableCell>
                      <TableCell className="text-slate-500">{item.product_code || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                          {item.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        KES {unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {value.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Sale Dialog */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Consignment Sale</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4 max-h-96 overflow-y-auto">
            {selectedItems.map(itemId => {
              const item = consignmentStock.find(i => i.id === itemId);
              if (!item) return null;
              
              return (
                <div key={itemId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{item.product_description}</p>
                    <p className="text-sm text-slate-500">Available: {item.quantity}</p>
                  </div>
                  <Input
                    type="number"
                    className="w-24"
                    min={0}
                    max={item.quantity}
                    value={saleQuantities[itemId] || ""}
                    onChange={(e) => setSaleQuantities(prev => ({
                      ...prev,
                      [itemId]: Math.min(parseInt(e.target.value) || 0, item.quantity)
                    }))}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaleDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => recordSaleMutation.mutate()}
              disabled={recordSaleMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {recordSaleMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Sale
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}