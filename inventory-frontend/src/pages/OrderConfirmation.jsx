import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { CheckCircle, Package, ShoppingBag, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrderConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => base44.entities.Order.filter({ id: orderId }),
    select: (data) => data[0],
    enabled: !!orderId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["orderItems", orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Order not found</h2>
          <Link to={createPageUrl("Marketplace")}>
            <Button variant="outline">Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order Confirmed!</h1>
          <p className="text-slate-600 mb-8">
            Thank you for your order. We've received your request and will process it shortly.
          </p>

          <div className="bg-slate-50 rounded-lg p-6 mb-8">
            <p className="text-sm text-slate-500 mb-2">Order Number</p>
            <p className="text-2xl font-bold text-slate-900 mb-4">{order.order_number}</p>
            
            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-medium text-slate-900">{order.customer_name}</p>
                <p className="text-sm text-slate-600">{order.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 mt-1">
                  {order.payment_status} • {order.payment_method}
                </Badge>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 mb-8">
            <h3 className="font-semibold text-slate-900 mb-4 text-left">Order Items</h3>
            <div className="space-y-2 text-left">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    {item.product_description} × {item.quantity}
                  </span>
                  <span className="font-medium text-slate-900">
                    KES {(item.line_total || 0).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-lg font-bold text-slate-900 pt-3 border-t">
                <span>Total</span>
                <span>KES {(order.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {order.payment_method === "mpesa" && order.payment_status === "pending" && (
            <Alert className="mb-6 bg-amber-50 border-amber-200 text-left">
              <Smartphone className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Please check your phone for the M-Pesa payment prompt to complete your order.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to={createPageUrl("Marketplace")} className="flex-1">
              <Button variant="outline" className="w-full">
                <Home className="w-4 h-4 mr-2" />
                Continue Shopping
              </Button>
            </Link>
            <Link to={createPageUrl("MyOrders")} className="flex-1">
              <Button className="w-full bg-slate-900 hover:bg-slate-800">
                <ShoppingBag className="w-4 h-4 mr-2" />
                View My Orders
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}