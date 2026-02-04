import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Package, 
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ORDER_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const PAYMENT_STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
};

export default function OrderDetail() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => base44.entities.Order.filter({ id: orderId }),
    select: (data) => data[0],
    enabled: !!orderId,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["orderItems", orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Order not found</h2>
          <Link to={createPageUrl("MyOrders")}>
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Link to={createPageUrl("MyOrders")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Orders
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Order {order.order_number}</h1>
            <p className="text-slate-500 mt-1">
              Placed on {format(new Date(order.created_date), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className={ORDER_STATUS_COLORS[order.order_status]} size="lg">
              {order.order_status}
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Mail className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-semibold text-slate-900">{order.customer_name}</p>
                <p className="text-sm text-slate-600">{order.customer_email}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Phone className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-semibold text-slate-900">{order.customer_phone}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <CreditCard className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <p className="font-semibold text-slate-900 capitalize">{order.payment_method}</p>
                <Badge variant="secondary" className={`${PAYMENT_STATUS_COLORS[order.payment_status]} mt-1`}>
                  {order.payment_status}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {order.delivery_address && (
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <MapPin className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-500 mb-1">Delivery Address</p>
                <p className="text-slate-900">{order.delivery_address}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-slate-900">Order Items</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingItems ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(4)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">KES {(item.unit_price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      KES {(item.line_total || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="p-6 border-t bg-slate-50">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>KES {(order.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Delivery</span>
                  <span>
                    {order.delivery_fee === 0 ? (
                      <span className="text-emerald-600 font-medium">FREE</span>
                    ) : (
                      `KES ${(order.delivery_fee || 0).toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t">
                  <span>Total</span>
                  <span>KES {(order.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}