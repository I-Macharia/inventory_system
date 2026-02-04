import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Loader2,
  CheckCircle,
  Package,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/common/EmptyState";

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [cart, setCart] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    delivery_address: "",
    payment_method: "mpesa",
    order_type: "retail",
    notes: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("marketplace_cart");
    if (saved) setCart(JSON.parse(saved));
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const deliveryFee = subtotal > 5000 ? 0 : 300;
  const total = subtotal + deliveryFee;

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      // Create order
      const order = await base44.entities.Order.create({
        order_number: `ORD-${Date.now().toString().slice(-8)}`,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        delivery_address: formData.delivery_address,
        order_type: formData.order_type,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: total,
        items_count: cart.length,
        total_quantity: cart.reduce((sum, i) => sum + i.quantity, 0),
        payment_status: "pending",
        payment_method: formData.payment_method,
        order_status: "pending",
        notes: formData.notes,
      });

      // Create order items and update stock
      for (const item of cart) {
        await base44.entities.OrderItem.create({
          order_id: order.id,
          order_number: order.order_number,
          product_id: item.product_id,
          product_code: item.gpm_code,
          product_description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.quantity * item.unit_price,
        });

        // Reduce master stock
        const products = await base44.entities.Product.filter({ id: item.product_id });
        const product = products[0];
        if (product) {
          await base44.entities.Product.update(product.id, {
            master_stock: Math.max(0, (product.master_stock || 0) - item.quantity),
            total_sold: (product.total_sold || 0) + item.quantity,
          });

          // Record stock movement
          await base44.entities.StockMovement.create({
            product_id: product.id,
            product_code: product.gpm_code,
            product_description: product.description,
            movement_type: "dispatch_normal",
            quantity: -item.quantity,
            reference_type: "sale_report",
            reference_id: order.id,
            reference_number: order.order_number,
            balance_after: Math.max(0, (product.master_stock || 0) - item.quantity),
            notes: `Marketplace order by ${formData.customer_name}`,
          });
        }
      }

      // Clear cart
      localStorage.removeItem("marketplace_cart");
      
      return order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries();
      navigate(createPageUrl("OrderConfirmation") + `?order_id=${order.id}`);
    },
  });

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            description="Add products to your cart before checking out"
            action={() => window.location.href = createPageUrl("Marketplace")}
            actionLabel="Browse Products"
          />
        </div>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    placeOrderMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <Link to={createPageUrl("Cart")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        placeholder="0700 000 000"
                        required
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Delivery Address</h2>
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Textarea
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    placeholder="Enter your full delivery address"
                    rows={3}
                    required
                  />
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment Method</h2>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        M-Pesa
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Credit/Debit Card
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">Cash on Delivery</SelectItem>
                  </SelectContent>
                </Select>

                {formData.payment_method === "mpesa" && (
                  <Alert className="mt-4 bg-emerald-50 border-emerald-200">
                    <AlertDescription className="text-emerald-800 text-sm">
                      You will receive an M-Pesa prompt after placing your order
                    </AlertDescription>
                  </Alert>
                )}
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Notes (Optional)</h2>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special instructions for your order"
                  rows={3}
                />
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{item.description}</p>
                        <p className="text-slate-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-medium text-slate-900 ml-2">
                        KES {(item.quantity * item.unit_price).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 py-4 border-y border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 font-medium">FREE</span>
                      ) : (
                        `KES ${deliveryFee.toLocaleString()}`
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-xl font-bold text-slate-900 mt-4 mb-6">
                  <span>Total</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-6"
                  disabled={placeOrderMutation.isPending}
                >
                  {placeOrderMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>

                {deliveryFee === 0 && (
                  <p className="text-center text-sm text-emerald-600 mt-3 font-medium">
                    🎉 You qualify for free delivery!
                  </p>
                )}
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}