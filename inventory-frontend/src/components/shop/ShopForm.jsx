import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ShopForm({ shop, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: shop?.name || "",
    type: shop?.type || "normal",
    contact_person: shop?.contact_person || "",
    phone: shop?.phone || "",
    email: shop?.email || "",
    address: shop?.address || "",
    notes: shop?.notes || "",
    status: shop?.status || "active",
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      if (shop) {
        return base44.entities.Shop.update(shop.id, data);
      }
      return base44.entities.Shop.create(data);
    },
    onSuccess,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formData.type === "consignment" && (
        <Alert className="bg-violet-50 border-violet-200">
          <AlertCircle className="h-4 w-4 text-violet-600" />
          <AlertDescription className="text-violet-800">
            Consignment shops keep stock ownership until the product is sold. Stock dispatched here will not reduce your master store until a sale is confirmed.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Shop Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Naivas Buruburu"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Shop Type *</Label>
        <Select 
          value={formData.type} 
          onValueChange={(val) => setFormData({ ...formData, type: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal - Stock sold on dispatch</SelectItem>
            <SelectItem value="consignment">Consignment - You own until sold (e.g., Naivas)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_person">Contact Person</Label>
          <Input
            id="contact_person"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="Contact name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0700 000 000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="shop@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Physical address"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select 
          value={formData.status} 
          onValueChange={(val) => setFormData({ ...formData, status: val })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {shop ? "Update" : "Create"} Shop
        </Button>
      </div>
    </form>
  );
}