import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, ShoppingCart, Package, Filter, ShoppingBag } from "lucide-react";
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
import EmptyState from "@/components/common/EmptyState";

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState([]);

  // Load cart from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("marketplace_cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: () => base44.entities.Product.filter({ status: "active" }),
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    const hasStock = (p.master_stock || 0) > 0;
    return matchesSearch && matchesCategory && hasStock;
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product) => {
    const newCart = [...cart];
    const existing = newCart.find(item => item.product_id === product.id);
    
    if (existing) {
      existing.quantity += 1;
    } else {
      newCart.push({
        product_id: product.id,
        description: product.description,
        gpm_code: product.gpm_code,
        unit_price: product.unit_price,
        quantity: 1,
        image: product.image_url,
      });
    }
    
    setCart(newCart);
    localStorage.setItem("marketplace_cart", JSON.stringify(newCart));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">GPM Marketplace</h1>
                <p className="text-sm text-slate-500">Shop quality products</p>
              </div>
            </div>
            <Link to={createPageUrl("Cart")}>
              <Button variant="outline" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartItemCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-emerald-600">
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="aspect-square bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded" />
                  <div className="h-3 bg-slate-200 rounded w-2/3" />
                  <div className="h-8 bg-slate-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search || categoryFilter !== "all" ? "No products found" : "No products available"}
            description={search || categoryFilter !== "all" ? "Try adjusting your filters" : "Products will appear here when added"}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link to={createPageUrl("ProductDetail") + `?id=${product.id}`}>
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-400" />
                  </div>
                </Link>
                <div className="p-4">
                  <Link to={createPageUrl("ProductDetail") + `?id=${product.id}`}>
                    <h3 className="font-semibold text-slate-900 mb-2 hover:text-slate-600 transition-colors">
                      {product.description}
                    </h3>
                  </Link>
                  {product.category && (
                    <Badge variant="secondary" className="mb-3 text-xs">
                      {product.category}
                    </Badge>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-slate-900">
                      KES {(product.unit_price || 0).toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500">
                      {product.master_stock || 0} in stock
                    </span>
                  </div>
                  <Button 
                    onClick={() => addToCart(product)}
                    className="w-full bg-slate-900 hover:bg-slate-800"
                    disabled={!product.master_stock || product.master_stock <= 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}