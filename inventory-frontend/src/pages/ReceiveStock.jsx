import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Package, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle,
  Upload,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/pageHeader";

export default function ReceiveStock() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [receiptData, setReceiptData] = useState({
    receipt_number: `REC-${Date.now().toString().slice(-6)}`,
    receipt_date: new Date().toISOString().split("T")[0],
    supplier: "",
    notes: "",
    items: [],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const addItem = () => {
    setReceiptData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: "",
        description: "",
        quantity: 1,
        cost_price: 0,
      }],
    }));
  };

  const updateItem = (index, field, value) => {
    setReceiptData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (field === "product_id" && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          newItems[index].description = product.description;
          newItems[index].cost_price = product.cost_price || 0;
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index) => {
    setReceiptData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const totalQuantity = receiptData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalValue = receiptData.items.reduce((sum, item) => 
    sum + ((item.quantity || 0) * (item.cost_price || 0)), 0
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Create stock receipt
      const receipt = await base44.entities.StockReceipt.create({
        receipt_number: receiptData.receipt_number,
        receipt_date: receiptData.receipt_date,
        supplier: receiptData.supplier,
        total_items: receiptData.items.length,
        total_quantity: totalQuantity,
        total_value: totalValue,
        notes: receiptData.notes,
        status: "confirmed",
      });

      // Process each item
      for (const item of receiptData.items) {
        let productId = item.product_id;
        
        // Create product if doesn't exist
        if (!productId && item.description) {
          const newProduct = await base44.entities.Product.create({
            description: item.description,
            cost_price: item.cost_price,
            master_stock: item.quantity,
            status: "active",
          });
          productId = newProduct.id;
        } else if (productId) {
          // Update existing product stock
          const product = products.find(p => p.id === productId);
          await base44.entities.Product.update(productId, {
            master_stock: (product?.master_stock || 0) + item.quantity,
            cost_price: item.cost_price || product?.cost_price,
          });
        }

        if (!productId) continue;

        const product = products.find(p => p.id === productId);

        // Record stock movement
        await base44.entities.StockMovement.create({
          product_id: productId,
          product_code: product?.gpm_code,
          product_description: item.description,
          movement_type: "stock_in",
          quantity: item.quantity,
          reference_type: "stock_receipt",
          reference_id: receipt.id,
          reference_number: receipt.receipt_number,
          balance_after: (product?.master_stock || 0) + item.quantity,
          notes: receiptData.supplier ? `Received from ${receiptData.supplier}` : undefined,
        });
      }

      return receipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate(createPageUrl("Products"));
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Receive Stock"
          subtitle="Add new stock to your master store"
        />

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Receipt Details</h3>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Receipt Number</Label>
                <Input
                  value={receiptData.receipt_number}
                  onChange={(e) => setReceiptData(prev => ({ 
                    ...prev, 
                    receipt_number: e.target.value 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Receipt Date</Label>
                <Input
                  type="date"
                  value={receiptData.receipt_date}
                  onChange={(e) => setReceiptData(prev => ({ 
                    ...prev, 
                    receipt_date: e.target.value 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={receiptData.supplier}
                  onChange={(e) => setReceiptData(prev => ({ 
                    ...prev, 
                    supplier: e.target.value 
                  }))}
                  placeholder="Supplier name"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={receiptData.notes}
                onChange={(e) => setReceiptData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={2}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Items</h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.product_id}
                          onValueChange={(val) => updateItem(index, "product_id", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product">
                              {item.description || "Select product"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!item.product_id && (
                          <Input
                            className="mt-2"
                            placeholder="Or enter new product name"
                            value={item.description || ""}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-24"
                          value={item.quantity || ""}
                          onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-28"
                          value={item.cost_price || ""}
                          onChange={(e) => updateItem(index, "cost_price", parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        KES {((item.quantity || 0) * (item.cost_price || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {receiptData.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        No items added. Click "Add Item" to start.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {receiptData.items.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <div className="text-right space-y-1">
                  <p className="text-slate-500">
                    {receiptData.items.length} items • {totalQuantity.toLocaleString()} units
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    KES {totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || receiptData.items.length === 0}
              className="bg-slate-900 hover:bg-slate-800"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Receipt
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}