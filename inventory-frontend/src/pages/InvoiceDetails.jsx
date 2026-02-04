import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  FileText, 
  Store, 
  Calendar, 
  Package,
  Download,
  ExternalLink
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
import PageHeader from "@/components/common/pageHeader";

export default function InvoiceDetails() {
  const params = new URLSearchParams(window.location.search);
  const invoiceId = params.get("id");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => base44.entities.Invoice.filter({ id: invoiceId }),
    select: (data) => data[0],
    enabled: !!invoiceId,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["invoiceItems", invoiceId],
    queryFn: () => base44.entities.InvoiceItem.filter({ invoice_id: invoiceId }),
    enabled: !!invoiceId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-64 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Invoice not found</h2>
          <p className="text-slate-500 mb-6">The invoice you're looking for doesn't exist.</p>
          <Link to={createPageUrl("Invoices")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Invoices")} className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Link>
        </div>

        <PageHeader
          title={`Invoice ${invoice.invoice_number}`}
          actions={
            invoice.file_url && (
              <a href={invoice.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Original
                </Button>
              </a>
            )
          }
        />

        {/* Invoice Header Info */}
        <Card className="p-6 mb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Store className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Shop</p>
                <p className="font-semibold text-slate-900">{invoice.shop_name}</p>
                <Badge 
                  variant="secondary" 
                  className={`mt-1 ${
                    invoice.invoice_type === "consignment" 
                      ? "bg-violet-100 text-violet-700" 
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {invoice.invoice_type}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Calendar className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Invoice Date</p>
                <p className="font-semibold text-slate-900">
                  {invoice.invoice_date 
                    ? format(new Date(invoice.invoice_date), "MMM d, yyyy")
                    : "-"
                  }
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Units</p>
                <p className="font-semibold text-slate-900">
                  {(invoice.total_quantity || 0).toLocaleString()} units
                </p>
                <p className="text-sm text-slate-500">{invoice.items_count || 0} line items</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Amount</p>
                <p className="font-bold text-2xl text-slate-900">
                  KES {(invoice.total_amount || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {invoice.invoice_type === "consignment" && (
            <div className="mt-6 p-4 rounded-lg bg-violet-50 border border-violet-200">
              <p className="text-violet-800 text-sm">
                <strong>Consignment Note:</strong> Stock from this invoice is tracked as "on consignment" at {invoice.shop_name}. 
                It remains your ownership until sales are confirmed.
              </p>
            </div>
          )}
        </Card>

        {/* Line Items */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-slate-900">Line Items</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingItems ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_description}</TableCell>
                    <TableCell className="text-slate-500">{item.product_code || "-"}</TableCell>
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
          
          {items.length > 0 && (
            <div className="p-6 border-t bg-slate-50">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>KES {(invoice.subtotal || invoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t">
                    <span>Total</span>
                    <span>KES {(invoice.total_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}