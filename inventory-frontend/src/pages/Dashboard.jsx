import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Package, 
  Store, 
  FileText, 
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  ShoppingCart,
  Warehouse
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from "@/components/dashboard/StatsCard";
import PageHeader from "@/components/common/pageHeader";
import StockBadge from "@/components/stock/StockBadge";
import UserRequestsCard from "@/components/admin/UserRequestsCard";



export default function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 100),
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery({
    queryKey: ["shops"],
    queryFn: () => base44.entities.Shop.list("-created_date", 50),
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 10),
  });

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ["movements"],
    queryFn: () => base44.entities.StockMovement.list("-created_date", 10),
  });

  const isLoading = loadingProducts || loadingShops || loadingInvoices;

  // Calculate stats
  const totalMasterStock = products.reduce((sum, p) => sum + (p.master_stock || 0), 0);
  const totalConsignment = products.reduce((sum, p) => sum + (p.total_consignment || 0), 0);
  const totalOwned = totalMasterStock + totalConsignment;
  const lowStockProducts = products.filter(p => (p.master_stock || 0) <= (p.reorder_level || 10));
  const activeShops = shops.filter(s => s.status === "active").length;
  const consignmentShops = shops.filter(s => s.type === "consignment").length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="Dashboard" 
          subtitle="Stock management overview"
          actions={
            <Link to={createPageUrl("UploadInvoice")}>
              <Button className="bg-slate-900 hover:bg-slate-800">
                <FileText className="w-4 h-4 mr-2" />
                Upload Invoice
              </Button>
            </Link>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Master Stock"
            value={isLoading ? "..." : totalMasterStock.toLocaleString()}
            subtitle="Units in warehouse"
            icon={Warehouse}
          />
          <StatsCard
            title="On Consignment"
            value={isLoading ? "..." : totalConsignment.toLocaleString()}
            subtitle="Units at shops (owned)"
            icon={Package}
          />
          <StatsCard
            title="Total Owned"
            value={isLoading ? "..." : totalOwned.toLocaleString()}
            subtitle="Master + Consignment"
            icon={ShoppingCart}
          />
          <StatsCard
            title="Active Shops"
            value={isLoading ? "..." : `${activeShops} / ${consignmentShops} consign`}
            subtitle={`${consignmentShops} consignment shops`}
            icon={Store}
          />
        </div>

        <div className="mb-8">
          <UserRequestsCard />
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Card className="p-6 mb-8 border-amber-200 bg-amber-50">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Low Stock Alert</h3>
                <p className="text-amber-700 text-sm mb-3">
                  {lowStockProducts.length} product(s) are running low on stock
                </p>
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.slice(0, 5).map(product => (
                    <Badge key={product.id} variant="secondary" className="bg-white text-amber-800 border-amber-200">
                      {product.description} ({product.master_stock || 0})
                    </Badge>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      +{lowStockProducts.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
              <Link to={createPageUrl("Products") + "?filter=low"}>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                  View All
                </Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Recent Invoices</h2>
              <Link to={createPageUrl("Invoices")}>
                <Button variant="ghost" size="sm" className="text-slate-600">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {loadingInvoices ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No invoices yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map(invoice => (
                  <Link 
                    key={invoice.id} 
                    to={createPageUrl("InvoiceDetails") + `?id=${invoice.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-medium text-slate-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-slate-500">{invoice.shop_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">
                          KES {(invoice.total_amount || 0).toLocaleString()}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={invoice.invoice_type === "consignment" 
                            ? "bg-violet-100 text-violet-700" 
                            : "bg-sky-100 text-sky-700"
                          }
                        >
                          {invoice.invoice_type}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Stock Movements */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Recent Stock Movements</h2>
              <Link to={createPageUrl("StockMovements")}>
                <Button variant="ghost" size="sm" className="text-slate-600">
                  View all <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            {loadingMovements ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No movements yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movements.map(movement => (
                  <div key={movement.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        movement.quantity > 0 ? "bg-emerald-500" : "bg-rose-500"
                      }`} />
                      <div>
                        <p className="font-medium text-slate-900 text-sm">
                          {movement.product_description || movement.product_code}
                        </p>
                        <p className="text-xs text-slate-500">
                          {movement.movement_type?.replace(/_/g, " ")} • {movement.shop_name || "Master Store"}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={movement.quantity > 0 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-rose-100 text-rose-700"
                      }
                    >
                      {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}