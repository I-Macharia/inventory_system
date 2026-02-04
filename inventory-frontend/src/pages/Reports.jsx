import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { 
  FileSpreadsheet, 
  Download, 
  Package, 
  Store, 
  TrendingUp,
  Calendar,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/pageHeader";
import StockBadge from "@/components/stock/StockBadge";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: () => base44.entities.Shop.list("-created_date", 100),
  });

  const { data: consignmentStock = [] } = useQuery({
    queryKey: ["consignmentStock"],
    queryFn: () => base44.entities.ConsignmentStock.list(),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
  });

  // Calculate totals
  const totalMasterStock = products.reduce((sum, p) => sum + (p.master_stock || 0), 0);
  const totalConsignment = products.reduce((sum, p) => sum + (p.total_consignment || 0), 0);
  const totalOwned = totalMasterStock + totalConsignment;
  const totalSold = products.reduce((sum, p) => sum + (p.total_sold || 0), 0);

  // Stock value
  const masterStockValue = products.reduce((sum, p) => 
    sum + ((p.master_stock || 0) * (p.unit_price || 0)), 0
  );
  const consignmentValue = products.reduce((sum, p) => 
    sum + ((p.total_consignment || 0) * (p.unit_price || 0)), 0
  );

  // Consignment by shop
  const consignmentByShop = shops
    .filter(s => s.type === "consignment")
    .map(shop => {
      const shopStock = consignmentStock.filter(c => c.shop_id === shop.id);
      const totalQty = shopStock.reduce((sum, c) => sum + (c.quantity || 0), 0);
      const totalVal = shopStock.reduce((sum, c) => {
        const product = products.find(p => p.id === c.product_id);
        return sum + ((c.quantity || 0) * (product?.unit_price || 0));
      }, 0);
      return { ...shop, totalQty, totalVal, itemCount: shopStock.length };
    })
    .filter(s => s.totalQty > 0);

  // Export functions
  const exportToCSV = (data, filename, headers) => {
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const val = row[h.toLowerCase().replace(/ /g, "_")] ?? row[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportStockReport = () => {
    const data = products.map(p => ({
      description: p.description,
      gpm_code: p.gpm_code || "",
      master_stock: p.master_stock || 0,
      on_consignment: p.total_consignment || 0,
      total_owned: (p.master_stock || 0) + (p.total_consignment || 0),
      total_sold: p.total_sold || 0,
      unit_price: p.unit_price || 0,
      stock_value: ((p.master_stock || 0) + (p.total_consignment || 0)) * (p.unit_price || 0),
    }));
    exportToCSV(data, "stock_report", [
      "Description", "GPM_Code", "Master_Stock", "On_Consignment", "Total_Owned", "Total_Sold", "Unit_Price", "Stock_Value"
    ]);
  };

  const exportConsignmentReport = () => {
    const data = consignmentStock.map(c => {
      const product = products.find(p => p.id === c.product_id);
      return {
        shop_name: c.shop_name,
        product: c.product_description,
        product_code: c.product_code || "",
        quantity: c.quantity || 0,
        unit_price: product?.unit_price || 0,
        value: (c.quantity || 0) * (product?.unit_price || 0),
      };
    });
    exportToCSV(data, "consignment_report", [
      "Shop_Name", "Product", "Product_Code", "Quantity", "Unit_Price", "Value"
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Reports"
          subtitle="Stock reports and analytics"
        />

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Master Stock</p>
                <p className="text-2xl font-bold text-slate-900">{totalMasterStock.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-1">KES {masterStockValue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100">
                <Package className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">On Consignment</p>
                <p className="text-2xl font-bold text-violet-600">{totalConsignment.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-1">KES {consignmentValue.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-violet-100">
                <Store className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Owned</p>
                <p className="text-2xl font-bold text-slate-900">{totalOwned.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-1">KES {(masterStockValue + consignmentValue).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Sold</p>
                <p className="text-2xl font-bold text-slate-900">{totalSold.toLocaleString()}</p>
                <p className="text-sm text-slate-500 mt-1">Lifetime units</p>
              </div>
              <div className="p-3 rounded-xl bg-sky-100">
                <FileSpreadsheet className="w-6 h-6 text-sky-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Export Buttons */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Export:</span>
            <Button variant="outline" size="sm" onClick={exportStockReport}>
              <Download className="w-4 h-4 mr-2" />
              Stock Report (CSV)
            </Button>
            <Button variant="outline" size="sm" onClick={exportConsignmentReport}>
              <Download className="w-4 h-4 mr-2" />
              Consignment Report (CSV)
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="stock" className="space-y-6">
          <TabsList>
            <TabsTrigger value="stock">Stock Summary</TabsTrigger>
            <TabsTrigger value="consignment">Consignment by Shop</TabsTrigger>
            <TabsTrigger value="low">Low Stock</TabsTrigger>
          </TabsList>

          <TabsContent value="stock">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Product</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Master Stock</TableHead>
                    <TableHead className="text-right">On Consignment</TableHead>
                    <TableHead className="text-right">Total Owned</TableHead>
                    <TableHead className="text-right">Total Sold</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => {
                    const total = (product.master_stock || 0) + (product.total_consignment || 0);
                    const value = total * (product.unit_price || 0);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.description}</TableCell>
                        <TableCell className="text-slate-500">{product.gpm_code || "-"}</TableCell>
                        <TableCell className="text-right">
                          <StockBadge quantity={product.master_stock || 0} reorderLevel={product.reorder_level || 10} />
                        </TableCell>
                        <TableCell className="text-right text-violet-600 font-medium">
                          {(product.total_consignment || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-slate-500">
                          {(product.total_sold || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          KES {value.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="consignment">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Shop</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Total Units</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consignmentByShop.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                        No consignment stock at any shop
                      </TableCell>
                    </TableRow>
                  ) : (
                    consignmentByShop.map(shop => (
                      <TableRow key={shop.id}>
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell className="text-right">{shop.itemCount}</TableCell>
                        <TableCell className="text-right font-semibold text-violet-600">
                          {shop.totalQty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          KES {shop.totalVal.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="low">
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Product</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products
                    .filter(p => (p.master_stock || 0) <= (p.reorder_level || 10))
                    .sort((a, b) => (a.master_stock || 0) - (b.master_stock || 0))
                    .map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.description}</TableCell>
                        <TableCell className="text-slate-500">{product.gpm_code || "-"}</TableCell>
                        <TableCell className="text-right">
                          <StockBadge quantity={product.master_stock || 0} reorderLevel={product.reorder_level || 10} />
                        </TableCell>
                        <TableCell className="text-right">{product.reorder_level || 10}</TableCell>
                        <TableCell>
                          <span className={(product.master_stock || 0) === 0 
                            ? "text-rose-600 font-medium" 
                            : "text-amber-600 font-medium"
                          }>
                            {(product.master_stock || 0) === 0 ? "Out of Stock" : "Low Stock"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                  {products.filter(p => (p.master_stock || 0) <= (p.reorder_level || 10)).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        All products are above reorder levels
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}