import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  "Toys",
  "School Supplies",
  "Household Items",
  "Electronics",
  "Food & Beverages",
  "Cosmetics",
  "Clothing",
  "Other"
];

/**
 * @typedef {Object} Product
 * @property {number} [id] - Product ID
 * @property {string} [gpm_code] - GPM code
 * @property {string} [item_code] - Item code
 * @property {string} [description] - Product description
 * @property {string} [category] - Product category
 * @property {number} [unit_price] - Selling price
 * @property {number} [cost_price] - Cost price
 * @property {number} [reorder_level] - Reorder level
 * @property {number} [master_stock] - Master stock quantity
 * @property {string} [status] - Product status
 */

/**
 * Product form component for creating/updating products
 * @component
 * @param {Object} props
 * @param {Product} [props.product] - Existing product to edit
 * @param {(result: any) => void} props.onSuccess - Callback on successful submission
 * @param {() => void} props.onCancel - Callback to cancel form
 * @returns {React.ReactElement}
 */
export default function ProductForm({ product, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    gpm_code: product?.gpm_code || "",
    item_code: product?.item_code || "",
    description: product?.description || "",
    category: product?.category || "",
    unit_price: product?.unit_price || "",
    cost_price: product?.cost_price || "",
    reorder_level: product?.reorder_level || 10,
    master_stock: product?.master_stock || 0,
    status: product?.status || "active",
  });

  const mutation = useMutation({
    mutationFn: (
      /** @type {Record<string, any>} */ data
    ) => {
      const cleanData = {
        ...data,
        unit_price: data.unit_price ? parseFloat(data.unit_price) : null,
        cost_price: data.cost_price ? parseFloat(data.cost_price) : null,
        reorder_level: parseInt(data.reorder_level) || 10,
        master_stock: parseInt(data.master_stock) || 0,
      };
      if (product) {
        return base44.entities.Product.update(product.id, cleanData);
      }
      return base44.entities.Product.create(cleanData);
    },
    onSuccess,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gpm_code">GPM Code</Label>
          <Input
            id="gpm_code"
            value={formData.gpm_code}
            onChange={(e) => setFormData({ ...formData, gpm_code: e.target.value })}
            placeholder="e.g., 736060612"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item_code">Item Code</Label>
          <Input
            id="item_code"
            value={formData.item_code}
            onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
            placeholder="e.g., N055039"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Product name/description"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select 
          value={formData.category} 
          onValueChange={(val) => setFormData({ ...formData, category: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit_price">Selling Price (KES)</Label>
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            value={formData.unit_price}
            onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost_price">Cost Price (KES)</Label>
          <Input
            id="cost_price"
            type="number"
            step="0.01"
            value={formData.cost_price}
            onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="master_stock">Current Stock</Label>
          <Input
            id="master_stock"
            type="number"
            value={formData.master_stock}
            onChange={(e) => setFormData({ ...formData, master_stock: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reorder_level">Reorder Level</Label>
          <Input
            id="reorder_level"
            type="number"
            value={formData.reorder_level}
            onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
          />
        </div>
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
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {product ? "Update" : "Create"} Product
        </Button>
      </div>
    </form>
  );
}