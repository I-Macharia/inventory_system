import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Minus, 
  Plus, 
  Trash2,
  ShoppingBag,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/common/EmptyState";

export default function Cart() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("marketplace_cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("marketplace_cart", JSON.stringify(newCart));
  };

  const updateQuantity = (productId, newQuantity) => {
    const newCart = cart.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: Math.max(1, newQuantity) }
        : item
    );
    saveCart(newCart);
  };

  const removeItem = (productId) => {
    const newCart = cart.filter(item => item.product_id !== productId);
    saveCart(newCart);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const deliveryFee = subtotal > 5000 ? 0 : 300;
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Link to={createPageUrl("Marketplace")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Continue Shopping
          </Link>
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Start adding products to your cart"
            action={() => window.location.href = createPageUrl("Marketplace")}
            actionLabel="Browse Products"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl("Marketplace")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Shopping
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="w-8 h-8 text-slate-900" />
          <h1 className="text-3xl font-bold text-slate-900">Shopping Cart</h1>
          <span className="text-slate-500">({cart.length} items)</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map(item => (
              <Card key={item.product_id} className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                    <Package className="w-10 h-10 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-1 truncate">
                      {item.description}
                    </h3>
                    {item.gpm_code && (
                      <p className="text-sm text-slate-500 mb-3">Code: {item.gpm_code}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          KES {item.unit_price.toLocaleString()} each
                        </p>
                        <p className="text-lg font-bold text-slate-900">
                          KES {(item.quantity * item.unit_price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => removeItem(item.product_id)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee</span>
                  <span>
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-600 font-medium">FREE</span>
                    ) : (
                      `KES ${deliveryFee.toLocaleString()}`
                    )}
                  </span>
                </div>
                {subtotal < 5000 && subtotal > 0 && (
                  <p className="text-xs text-slate-500">
                    Spend KES {(5000 - subtotal).toLocaleString()} more for free delivery
                  </p>
                )}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <Link to={createPageUrl("Checkout")}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 py-6">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}