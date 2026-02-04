import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Search, FileText, Plus, Filter, Download, Eye } from "lucide-react";
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
import PageHeader from "@/components/common/pageHeader";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.shop_name?.toLowerCase().includes(search.toLowerCase());
    
    if (filter === "normal") return matchesSearch && inv.invoice_type === "normal";
    if (filter === "consignment") return matchesSearch && inv.invoice_type === "consignment";
    return matchesSearch;
  });

  const columns = [
    {
      header: "Invoice #",
      cell: (row) => (
        <span className="font-semibold text-slate-900">{row.invoice_number}</span>
      ),
    },
    {
      header: "Shop",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.shop_name}</p>
          <Badge 
            variant="secondary" 
            className={row.invoice_type === "consignment" 
              ? "bg-violet-100 text-violet-700 mt-1" 
              : "bg-sky-100 text-sky-700 mt-1"
            }
          >
            {row.invoice_type}
          </Badge>
        </div>
      ),
    },
    {
      header: "Date",
      cell: (row) => row.invoice_date 
        ? format(new Date(row.invoice_date), "MMM d, yyyy")
        : "-",
    },
    {
      header: "Items",
      cell: (row) => `${row.items_count || 0} items`,
    },
    {
      header: "Quantity",
      cell: (row) => `${(row.total_quantity || 0).toLocaleString()} units`,
    },
    {
      header: "Total",
      cell: (row) => (
        <span className="font-semibold text-slate-900">
          KES {(row.total_amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "",
      cell: (row) => (
        <Link to={createPageUrl("InvoiceDetails") + `?id=${row.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </Link>
      ),
      className: "w-24",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Invoices"
          subtitle={`${invoices.length} invoices recorded`}
          actions={
            <Link to={createPageUrl("UploadInvoice")}>
              <Button className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
            </Link>
          }
        />

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by invoice # or shop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="normal">Normal (Sold)</SelectItem>
                <SelectItem value="consignment">Consignment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {!isLoading && invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Upload your first invoice to start tracking stock"
            action={() => window.location.href = createPageUrl("UploadInvoice")}
            actionLabel="Upload Invoice"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredInvoices}
            isLoading={isLoading}
            emptyMessage="No invoices match your search"
          />
        )}
      </div>
    </div>
  );
}