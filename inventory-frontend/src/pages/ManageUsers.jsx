import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { CheckCircle2, Clock3, UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/common/pageHeader";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";

export default function ManageUsers() {
  const [search, setSearch] = React.useState("");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["userRequests"],
    queryFn: async () => {
      const response = await api.get("/admin/requests");
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await api.post(`/admin/approve/${requestId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
    },
  });

  const filteredRequests = requests.filter((request) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      request.name?.toLowerCase().includes(query) ||
      request.email?.toLowerCase().includes(query) ||
      request.status?.toLowerCase().includes(query)
    );
  });

  const columns = [
    {
      header: "Name",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-sm text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant="secondary"
          className={
            row.status === "approved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }
        >
          {row.status === "approved" ? "Approved" : "Pending"}
        </Badge>
      ),
    },
    {
      header: "Action",
      cell: (row) => {
        if (row.status === "approved") {
          return (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Active
            </div>
          );
        }

        return (
          <Button
            size="sm"
            onClick={() => approveMutation.mutate(row.id)}
            disabled={approveMutation.isPending}
          >
            Approve access
          </Button>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Manage Users"
          subtitle="Review and approve access requests"
        />

        <Card className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {!isLoading && filteredRequests.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No access requests"
            description="New access requests will appear here once users submit the form."
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredRequests}
            isLoading={isLoading}
            emptyMessage="No requests match your filters"
          />
        )}
      </div>
    </div>
  );
}
