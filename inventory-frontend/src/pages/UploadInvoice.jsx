import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Store
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import ShopTypeBadge from "@/components/shop/ShopTypeBadge";

export default function UploadInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1); // 1: upload, 2: review, 3: confirm
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: "",
    shop_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    items: [],
    file_url: null,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: () => base44.entities.Shop.list("-created_date", 100),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const selectedShop = shops.find(s => s.id === invoiceData.shop_id);

  // Handle file upload and extraction
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setInvoiceData(prev => ({ ...prev, file_url }));

      // Extract data from invoice
      setProcessing(true);
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            shop_name: { type: "string" },
            invoice_date: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  gpm_code: { type: "string" },
                  item_code: { type: "string" },
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" },
                  line_total: { type: "number" }
                }
              }
            },
            total_amount: { type: "number" }
          }
        }
      });

      if (result.status === "success" && result.output) {
        const extracted = result.output;
        
        // Find matching shop
        let matchedShopId = "";
        if (extracted.shop_name) {
          const matchedShop = shops.find(s => 
            s.name.toLowerCase().includes(extracted.shop_name.toLowerCase()) ||
            extracted.shop_name.toLowerCase().includes(s.name.toLowerCase())
          );
          if (matchedShop) matchedShopId = matchedShop.id;
        }

        setInvoiceData(prev => ({
          ...prev,
          invoice_number: extracted.invoice_number || prev.invoice_number,
          shop_id: matchedShopId || prev.shop_id,
          invoice_date: extracted.invoice_date || prev.invoice_date,
          items: (extracted.items || []).map(item => ({
            ...item,
            product_id: findProductId(item.gpm_code, item.item_code, item.description),
          })),
          total_amount: extracted.total_amount,
        }));
        
        setStep(2);
      } else {
        setError("Could not extract data from invoice. Please enter manually.");
        setStep(2);
      }
    } catch (err) {
      setError("Failed to process invoice: " + err.message);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const findProductId = (gpmCode, itemCode, description) => {
    const product = products.find(p => 
      (gpmCode && p.gpm_code === gpmCode) ||
      (itemCode && p.item_code === itemCode) ||
      (description && p.description?.toLowerCase() === description?.toLowerCase())
    );
    return product?.id || "";
  };

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: "",
        gpm_code: "",
        description: "",
        quantity: 1,
        unit_price: 0,
        line_total: 0,
      }],
    }));
  };

  const updateItem = (index, field, value) => {
    setInvoiceData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-calculate line total
      if (field === "quantity" || field === "unit_price") {
        newItems[index].line_total = 
          (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
      }
      
      // If product selected, populate details
      if (field === "product_id" && value) {
        const product = products.find(p => p.id === value);
        if (product) {
          newItems[index].gpm_code = product.gpm_code || "";
          newItems[index].description = product.description || "";
          newItems[index].unit_price = product.unit_price || newItems[index].unit_price;
          newItems[index].line_total = 
            (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
        }
      }
      
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateTotals = () => {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    return { subtotal, total: subtotal };
  };

  // Submit invoice
  const submitMutation = useMutation({
    mutationFn: async () => {
      const shop = shops.find(s => s.id === invoiceData.shop_id);
      if (!shop) throw new Error("Please select a shop");

      const totals = calculateTotals();
      
      // Create invoice
      const invoice = await base44.entities.Invoice.create({
        invoice_number: invoiceData.invoice_number,
        shop_id: shop.id,
        shop_name: shop.name,
        invoice_type: shop.type,
        invoice_date: invoiceData.invoice_date,
        subtotal: totals.subtotal,
        total_amount: totals.total,
        items_count: invoiceData.items.length,
        total_quantity: invoiceData.items.reduce((sum, i) => sum + (i.quantity || 0), 0),
        file_url: invoiceData.file_url,
        status: "confirmed",
      });

      // Create invoice items and update stock
      for (const item of invoiceData.items) {
        let productId = item.product_id;
        
        // Create product if doesn't exist
        if (!productId && item.description) {
          const newProduct = await base44.entities.Product.create({
            gpm_code: item.gpm_code || "",
            description: item.description,
            unit_price: item.unit_price,
            master_stock: 0,
            total_consignment: 0,
            status: "active",
          });
          productId = newProduct.id;
        }

        if (!productId) continue;

        // Create invoice item
        await base44.entities.InvoiceItem.create({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          product_id: productId,
          product_code: item.gpm_code,
          product_description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        });

        const product = products.find(p => p.id === productId);
        
        if (shop.type === "normal") {
          // Direct sale - reduce master stock
          await base44.entities.Product.update(productId, {
            master_stock: Math.max(0, (product?.master_stock || 0) - item.quantity),
            total_sold: (product?.total_sold || 0) + item.quantity,
          });

          // Record stock movement
          await base44.entities.StockMovement.create({
            product_id: productId,
            product_code: item.gpm_code,
            product_description: item.description,
            movement_type: "dispatch_normal",
            quantity: -item.quantity,
            reference_type: "invoice",
            reference_id: invoice.id,
            reference_number: invoice.invoice_number,
            shop_id: shop.id,
            shop_name: shop.name,
            balance_after: Math.max(0, (product?.master_stock || 0) - item.quantity),
          });
        } else {
          // Consignment - move to consignment stock
          await base44.entities.Product.update(productId, {
            master_stock: Math.max(0, (product?.master_stock || 0) - item.quantity),
            total_consignment: (product?.total_consignment || 0) + item.quantity,
          });

          // Find or create consignment stock record
          const existingConsignment = await base44.entities.ConsignmentStock.filter({
            shop_id: shop.id,
            product_id: productId,
          });

          if (existingConsignment.length > 0) {
            await base44.entities.ConsignmentStock.update(existingConsignment[0].id, {
              quantity: (existingConsignment[0].quantity || 0) + item.quantity,
            });
          } else {
            await base44.entities.ConsignmentStock.create({
              shop_id: shop.id,
              shop_name: shop.name,
              product_id: productId,
              product_code: item.gpm_code,
              product_description: item.description,
              quantity: item.quantity,
            });
          }

          // Record stock movement
          await base44.entities.StockMovement.create({
            product_id: productId,
            product_code: item.gpm_code,
            product_description: item.description,
            movement_type: "dispatch_consignment",
            quantity: -item.quantity,
            reference_type: "invoice",
            reference_id: invoice.id,
            reference_number: invoice.invoice_number,
            shop_id: shop.id,
            shop_name: shop.name,
            balance_after: Math.max(0, (product?.master_stock || 0) - item.quantity),
            notes: "Stock moved to consignment",
          });
        }
      }

      return invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries();
      navigate(createPageUrl("InvoiceDetails") + `?id=${invoice.id}`);
    },
  });

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Upload Invoice"
          subtitle="Record a delivery/dispatch to a shop"
        />

        {error && (
          <Alert className="mb-6 bg-rose-50 border-rose-200">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <AlertDescription className="text-rose-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card className="p-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Upload className="w-10 h-10 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Upload Invoice PDF
              </h2>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Upload your invoice and we'll automatically extract the details. 
                You can also enter details manually.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    asChild 
                    className="bg-slate-900 hover:bg-slate-800"
                    disabled={uploading || processing}
                  >
                    <span>
                      {uploading || processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {uploading ? "Uploading..." : "Processing..."}
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Select File
                        </>
                      )}
                    </span>
                  </Button>
                </label>

                <span className="text-slate-400">or</span>

                <Button variant="outline" onClick={() => setStep(2)}>
                  Enter Manually
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Review & Edit */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Invoice Details</h3>
              
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Number *</Label>
                  <Input
                    value={invoiceData.invoice_number}
                    onChange={(e) => setInvoiceData(prev => ({ 
                      ...prev, 
                      invoice_number: e.target.value 
                    }))}
                    placeholder="e.g., GPM-1572"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shop *</Label>
                  <Select
                    value={invoiceData.shop_id}
                    onValueChange={(val) => setInvoiceData(prev => ({ ...prev, shop_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map(shop => (
                        <SelectItem key={shop.id} value={shop.id}>
                          <span className="flex items-center gap-2">
                            {shop.name}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              shop.type === "consignment" 
                                ? "bg-violet-100 text-violet-700" 
                                : "bg-sky-100 text-sky-700"
                            }`}>
                              {shop.type}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={invoiceData.invoice_date}
                    onChange={(e) => setInvoiceData(prev => ({ 
                      ...prev, 
                      invoice_date: e.target.value 
                    }))}
                  />
                </div>
              </div>

              {selectedShop && (
                <Alert className={`mt-4 ${
                  selectedShop.type === "consignment" 
                    ? "bg-violet-50 border-violet-200" 
                    : "bg-sky-50 border-sky-200"
                }`}>
                  <Store className={`h-4 w-4 ${
                    selectedShop.type === "consignment" ? "text-violet-600" : "text-sky-600"
                  }`} />
                  <AlertDescription className={
                    selectedShop.type === "consignment" ? "text-violet-800" : "text-sky-800"
                  }>
                    {selectedShop.type === "consignment" 
                      ? "This is a consignment shop. Stock will be tracked as 'on consignment' (still owned by you) until confirmed sold."
                      : "This is a normal shop. Stock will be marked as sold immediately upon confirming this invoice."
                    }
                  </AlertDescription>
                </Alert>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Line Items</h3>
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
                      <TableHead>Code</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.product_id}
                            onValueChange={(val) => updateItem(index, "product_id", val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select or type">
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
                            className="w-24"
                            value={item.gpm_code || ""}
                            onChange={(e) => updateItem(index, "gpm_code", e.target.value)}
                            placeholder="Code"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24"
                            value={item.unit_price || ""}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          KES {(item.line_total || 0).toLocaleString()}
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
                    {invoiceData.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          No items added. Click "Add Item" to start.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {invoiceData.items.length > 0 && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-slate-500">Total</p>
                    <p className="text-2xl font-bold text-slate-900">
                      KES {totals.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={
                  submitMutation.isPending || 
                  !invoiceData.invoice_number || 
                  !invoiceData.shop_id || 
                  invoiceData.items.length === 0
                }
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
                    Confirm Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}