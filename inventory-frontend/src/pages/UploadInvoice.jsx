import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import * as pdfjsLib from "pdfjs-dist";
import { 
  Upload, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Trash2,
  Store,
  Edit2
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

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function UploadInvoice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  
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

  // Parse GPM Invoice PDF
  const extractFromGPMPDF = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
      }

      // Extract invoice number (format: GPM-XXXX)
      const invoiceMatch = fullText.match(/GPM-(\d+)/i);
      const invoiceNumber = invoiceMatch ? `GPM-${invoiceMatch[1]}` : "";

      // Extract date (format: DD/MM/YYYY)
      const dateMatch = fullText.match(/DATE[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i);
      let invoiceDate = new Date().toISOString().split("T")[0];
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split("/");
        invoiceDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }

      // Extract line items from table
      // Format: GPM CODE | CODE | DESCRIPTION | QTY | RATE | AMOUNT
      const items = [];
      
      // Look for the table header row
      const tableStartMatch = fullText.match(/GPM\s+CODE\s+CODE\s+DESCRIPTION\s+QTY\s+RATE\s+AMOUNT/i);
      if (tableStartMatch) {
        // Find all item rows (GPM CODE pattern followed by numbers and description)
        const itemRegex = /(\d{10,})\s+(\w+)\s+([A-Z\s]+?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g;
        let match;
        
        while ((match = itemRegex.exec(fullText)) !== null) {
          // Skip commission rows
          if (match[3].toLowerCase().includes("commission")) continue;
          
          const gpmCode = match[1];
          const code = match[2];
          const description = match[3].trim();
          const quantity = parseFloat(match[4]);
          const rate = parseFloat(match[5]);
          const amount = parseFloat(match[6]);

          // Validate extracted data
          if (quantity > 0 && rate > 0 && description.length > 2) {
            items.push({
              product_id: "",
              gpm_code: gpmCode,
              description: description.replace(/\s+/g, " "),
              quantity: Math.round(quantity),
              unit_price: rate,
              line_total: amount,
            });
          }
        }
      }

      return { invoiceNumber, invoiceDate, items };
    } catch (err) {
      console.error("PDF extraction error:", err);
      return { invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0], items: [] };
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fileName = file.name.toLowerCase();
      
      if (!fileName.endsWith(".pdf")) {
        setError("Please upload a PDF invoice");
        setUploading(false);
        return;
      }

      setUploadedFileName(file.name);
      
      let extractedData = { invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0], items: [] };

      if (fileName.endsWith(".pdf")) {
        extractedData = await extractFromGPMPDF(file);
      }

      if (!extractedData.invoiceNumber || extractedData.items.length === 0) {
        setError("Could not extract invoice data. Please check the PDF format and try again.");
        setUploading(false);
        return;
      }

      setInvoiceData(prev => ({ 
        ...prev, 
        invoice_number: extractedData.invoiceNumber,
        invoice_date: extractedData.invoiceDate,
        items: extractedData.items,
        file_url: file.name
      }));

      setStep(2);
    } catch (err) {
      setError("Failed to process file: " + err.message);
    } finally {
      setUploading(false);
    }
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
      
      if (field === "quantity" || field === "unit_price") {
        newItems[index].line_total = 
          (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
      }
      
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      const shop = shops.find(s => s.id === invoiceData.shop_id);
      if (!shop) throw new Error("Please select a shop");
      if (invoiceData.items.length === 0) throw new Error("Please add at least one item");

      const totals = calculateTotals();
      
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

      for (const item of invoiceData.items) {
        let productId = item.product_id;
        let product = products.find(p => p.id === productId);
        
        if (!productId && item.description) {
          const newProduct = await base44.entities.Product.create({
            gpm_code: item.gpm_code || "",
            item_code: item.gpm_code || "",
            description: item.description,
            unit_price: item.unit_price,
            master_stock: 0,
            total_consignment: 0,
            total_sold: 0,
            status: "active",
          });
          productId = newProduct.id;
          product = newProduct;
        }

        if (!productId) continue;

        await base44.entities.InvoiceItem.create({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          product_id: productId,
          product_code: item.gpm_code || product?.gpm_code || "",
          product_description: item.description || product?.description || "",
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total,
        });

        if (shop.type === "normal") {
          const newMasterStock = Math.max(0, (product?.master_stock || 0) - item.quantity);
          const newTotalSold = (product?.total_sold || 0) + item.quantity;

          await base44.entities.Product.update(productId, {
            master_stock: newMasterStock,
            total_sold: newTotalSold,
          });

          await base44.entities.StockMovement.create({
            product_id: productId,
            product_code: item.gpm_code || product?.gpm_code || "",
            product_description: item.description || product?.description || "",
            movement_type: "dispatch_normal",
            quantity: -item.quantity,
            reference_type: "invoice",
            reference_id: invoice.id,
            reference_number: invoice.invoice_number,
            shop_id: shop.id,
            shop_name: shop.name,
            balance_after: newMasterStock,
            notes: `Dispatched to ${shop.name}`,
          });
        } else {
          const newMasterStock = Math.max(0, (product?.master_stock || 0) - item.quantity);
          const newTotalConsignment = (product?.total_consignment || 0) + item.quantity;

          await base44.entities.Product.update(productId, {
            master_stock: newMasterStock,
            total_consignment: newTotalConsignment,
          });

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
              product_code: item.gpm_code || product?.gpm_code || "",
              product_description: item.description || product?.description || "",
              quantity: item.quantity,
            });
          }

          await base44.entities.StockMovement.create({
            product_id: productId,
            product_code: item.gpm_code || product?.gpm_code || "",
            product_description: item.description || product?.description || "",
            movement_type: "dispatch_consignment",
            quantity: -item.quantity,
            reference_type: "invoice",
            reference_id: invoice.id,
            reference_number: invoice.invoice_number,
            shop_id: shop.id,
            shop_name: shop.name,
            balance_after: newMasterStock,
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
    onError: (err) => {
      setError(err.message);
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
                Upload your GPM invoice PDF and we'll automatically extract all details.
                You can review and edit before confirming.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button 
                    asChild 
                    className="bg-slate-900 hover:bg-slate-800"
                    disabled={uploading}
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Select PDF
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

              {uploadedFileName && (
                <p className="text-sm text-slate-500 mt-4">
                  Selected: <strong>{uploadedFileName}</strong>
                </p>
              )}
            </div>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Invoice Details</h3>
                {uploadedFileName && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    <Edit2 className="w-3 h-3 inline mr-1" />
                    Auto-extracted
                  </span>
                )}
              </div>
              
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
                          {shop.name} ({shop.type})
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
                      ? "Consignment shop - stock remains yours until sold."
                      : "Normal shop - stock will be marked as sold immediately."
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
                      <TableHead className="min-w-[150px]">Product</TableHead>
                      <TableHead className="w-24">GPM Code</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-24">Unit Price</TableHead>
                      <TableHead className="w-24">Total</TableHead>
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
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select">
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
                              className="mt-2 text-xs"
                              placeholder="New product"
                              value={item.description || ""}
                              onChange={(e) => updateItem(index, "description", e.target.value)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-24 text-xs"
                            value={item.gpm_code || ""}
                            onChange={(e) => updateItem(index, "gpm_code", e.target.value)}
                            placeholder="Code"
                            readOnly
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20 text-xs"
                            value={item.quantity || ""}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 text-xs"
                            value={item.unit_price || ""}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                            step="0.01"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {(item.line_total || 0).toFixed(2)}
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
                          No items. Click "Add Item" to start.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {invoiceData.items.length > 0 && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-slate-500 text-sm">Total Amount</p>
                    <p className="text-2xl font-bold text-slate-900">
                      Ksh {totals.total.toFixed(2)}
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