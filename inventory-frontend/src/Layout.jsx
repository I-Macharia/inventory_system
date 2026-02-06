import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  LayoutDashboard, 
  Package, 
  Store, 
  FileText, 
  TrendingUp,
  Upload,
  PackagePlus,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { name: "Home", page: "Landing", icon: LayoutDashboard },
  { name: "Dashboard", page: "Dashboard", icon: LayoutDashboard },
  { name: "Products", page: "Products", icon: Package },
  { name: "Shops", page: "Shops", icon: Store },
  { name: "Invoices", page: "Invoices", icon: FileText },
  { name: "Stock Movements", page: "StockMovements", icon: TrendingUp },
  { name: "Reports", page: "Reports", icon: BarChart3 },
  { name: "Manage Orders", page: "ManageOrders", icon: FileText },
];

const marketplaceNavItems = [
  { name: "Shop", page: "Marketplace", icon: Package },
  { name: "My Orders", page: "MyOrders", icon: FileText },
];

const quickActions = [
  { name: "Upload Invoice", page: "UploadInvoice", icon: Upload },
  { name: "Receive Stock", page: "ReceiveStock", icon: PackagePlus },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("admin"); // admin or marketplace
  const location = useLocation();

  const isActive = (page) => {
    return currentPageName === page;
  };

  // Auto-detect section based on current page
  React.useEffect(() => {
    const marketplacePages = ["Marketplace", "ProductDetail", "Cart", "Checkout", "MyOrders", "OrderConfirmation"];
    if (marketplacePages.includes(currentPageName)) {
      setActiveSection("marketplace");
    } else {
      setActiveSection("admin");
    }
  }, [currentPageName]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-bold text-slate-900">GPM Stock</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transition-transform duration-300",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">GPM Stock</span>
            </Link>
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Section Toggle */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setActiveSection("admin")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  activeSection === "admin"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Admin
              </button>
              <button
                onClick={() => setActiveSection("marketplace")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                  activeSection === "marketplace"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Shop
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {activeSection === "admin" ? (
              <>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        active 
                          ? "bg-slate-900 text-white" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}

                <div className="pt-4 mt-4 border-t border-slate-200">
                  <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Actions
                  </p>
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.page);
                    return (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          active 
                            ? "bg-emerald-600 text-white" 
                            : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {marketplaceNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.page);
                  return (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        active 
                          ? "bg-emerald-600 text-white" 
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
                <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <ShoppingBag className="w-8 h-8 text-emerald-600 mb-2" />
                  <p className="text-sm font-medium text-emerald-900 mb-1">Shop Quality Products</p>
                  <p className="text-xs text-emerald-700">Browse our catalog and place orders</p>
                </div>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100">
            <div className="px-3 py-2 rounded-lg bg-slate-50">
              <p className="text-xs text-slate-500">Inventory Management</p>
              <p className="text-sm font-medium text-slate-700">GPM Stock System</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        "lg:ml-64",
        "pt-16 lg:pt-0"
      )}>
        {children}
      </main>
    </div>
  );
}