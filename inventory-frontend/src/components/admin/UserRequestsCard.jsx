import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  UserPlus, 
  Mail, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UserRequestsCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedPassword, setCopiedPassword] = React.useState(null);

  // Fetch pending requests
  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ["user-requests"],
    queryFn: async () => {
      const response = await api.get("/admin/requests");
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Approve request mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId) => {
      const response = await api.post(`/admin/approve/${requestId}`);
      return response.data;
    },
    onSuccess: (data, requestId) => {
      // Show success message with temporary password
      toast({
        title: "User Approved Successfully",
        description: (
          <div className="space-y-2">
            <p>Username: <strong>{data.username}</strong></p>
            <div className="flex items-center gap-2 p-2 bg-slate-100 rounded">
              <code className="flex-1 text-sm">{data.temporary_password}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(data.temporary_password);
                  setCopiedPassword(requestId);
                  setTimeout(() => setCopiedPassword(null), 2000);
                }}
              >
                {copiedPassword === requestId ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-amber-600">
              ⚠️ Save this password! It won't be shown again.
            </p>
          </div>
        ),
        duration: 15000, // Show for 15 seconds
      });

      // Refetch requests
      queryClient.invalidateQueries({ queryKey: ["user-requests"] });
    },
    onError: (error) => {
      toast({
        title: "Error Approving User",
        description: error.response?.data?.detail || "Failed to approve user request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (requestId) => {
    if (confirm("Are you sure you want to approve this user request?")) {
      approveMutation.mutate(requestId);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Failed to load user requests. Please try again later.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pending Access Requests
            </h2>
            <p className="text-sm text-slate-500">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'} awaiting approval
            </p>
          </div>
        </div>
        {requests.length > 0 && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            {requests.length} pending
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>No pending requests</p>
          <p className="text-sm mt-1">All access requests have been processed</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-900">{request.name}</p>
                  <Badge 
                    variant="secondary" 
                    className="bg-amber-100 text-amber-700"
                  >
                    {request.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{request.email}</span>
                </div>
                {request.created_at && (
                  <p className="text-xs text-slate-500 mt-1">
                    Requested: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approveMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> When you approve a request, a temporary password will be generated. 
            Make sure to copy and share it with the user securely.
          </p>
        </div>
      )}
    </Card>
  );
}