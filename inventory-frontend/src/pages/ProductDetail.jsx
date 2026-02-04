import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, ShoppingCart, Package, Minus, Plus, Tag, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const navigate = useNavigate();
  
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("marketplace_cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => base44.entities.Product.filter({ id: productId }),
    select: (data) => data[0],
    enabled: !!productId,
  });

  const addToCart = () => {
    const newCart = [...cart];
    const existing = newCart.find(item => item.product_id === product.id);
    
    if (existing) {
      existing.quantity += quantity;
    } else {
      newCart.push({
        product_id: product.id,
        description: product.description,
        gpm_code: product.gpm_code,
        unit_price: product.unit_price,
        quantity: quantity,
      });
    }
    
    setCart(newCart);
    localStorage.setItem("marketplace_cart", JSON.stringify(newCart));
    navigate(createPageUrl("Cart"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-10 w-32 mb-6" />
          <div className="grid lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Product not found</h2>
          <Link to={createPageUrl("Marketplace")}>
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const maxQuantity = Math.min(product.master_stock || 0, 99);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to={createPageUrl("Marketplace")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
            <Package className="w-32 h-32 text-slate-400" />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                {product.description}
              </h1>
              {product.category && (
                <Badge variant="secondary" className="mb-4">
                  <Tag className="w-3 h-3 mr-1" />
                  {product.category}
                </Badge>
              )}
              {product.gpm_code && (
                <p className="text-slate-500 text-sm">Code: {product.gpm_code}</p>
              )}
            </div>

            <div className="py-4 border-y border-slate-200">
              <div className="text-4xl font-bold text-slate-900">
                KES {(product.unit_price || 0).toLocaleString()}
              </div>
              <p className="text-slate-500 mt-1">Per unit</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-slate-400" />
                <span className="text-slate-700">
                  {product.master_stock || 0} units available
                </span>
              </div>

              {(product.master_stock || 0) > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="w-20 text-center text-2xl font-semibold">
                        {quantity}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        disabled={quantity >= maxQuantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="text-2xl font-bold text-slate-900">
                        KES {(quantity * (product.unit_price || 0)).toLocaleString()}
                      </span>
                    </div>
                    <Button 
                      onClick={addToCart}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </>
              )}

              {(product.master_stock || 0) <= 0 && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200">
                  <p className="text-rose-700 font-medium">Out of Stock</p>
                  <p className="text-rose-600 text-sm mt-1">This product is currently unavailable</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}