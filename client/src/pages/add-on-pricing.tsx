import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DollarSign, Plus, Pencil, Power, Sparkles } from "lucide-react";

interface AddOn {
  id: number;
  name: string;
  displayName: string;
  price: number;
  description: string | null;
  category: string;
  isActive: number;
}

const CATEGORIES = [
  { value: "service", label: "Service (express, fold, hang)" },
  { value: "detergent", label: "Detergent (eco, hypoallergenic, fragrance)" },
  { value: "treatment", label: "Treatment (stain, starch, softener)" },
];

const blank = (): Partial<AddOn> => ({
  name: "",
  displayName: "",
  price: 0,
  description: "",
  category: "service",
  isActive: 1,
});

export default function AddOnPricingPage() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<AddOn> | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AddOn | null>(null);

  const { data: addOns = [], isLoading } = useQuery<AddOn[]>({
    queryKey: ["/api/admin/add-ons"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<AddOn>) => {
      if (data.id) {
        return apiRequest("PATCH", `/api/admin/add-ons/${data.id}`, data);
      }
      return apiRequest("POST", "/api/admin/add-ons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/add-ons"] });
      setEditing(null);
      toast({ title: "Saved", description: "Add-on pricing updated." });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save add-on",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/add-ons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/add-ons"] });
      setConfirmDeactivate(null);
      toast({ title: "Deactivated", description: "Customers will no longer see this add-on." });
    },
    onError: (err: any) => {
      toast({
        title: "Deactivate failed",
        description: err?.message || "Could not deactivate",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("PATCH", `/api/admin/add-ons/${id}`, { isActive: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/add-ons"] });
      toast({ title: "Reactivated" });
    },
    onError: (err: any) => {
      toast({
        title: "Reactivate failed",
        description: err?.message || "Could not reactivate",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!editing) return;
    if (!editing.name || !editing.displayName || editing.price === undefined || editing.price === null) {
      toast({
        title: "Missing fields",
        description: "Internal name, customer-facing name, and price are required.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(editing);
  };

  const active = addOns.filter((a) => a.isActive === 1);
  const inactive = addOns.filter((a) => a.isActive !== 1);

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-addon-pricing-title">
            <Sparkles className="h-5 w-5" />
            Add-on Pricing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customers see and select these add-ons when placing an order. Changes go live immediately.
          </p>
        </div>
        <Button onClick={() => setEditing(blank())} data-testid="button-create-addon">
          <Plus className="h-4 w-4 mr-2" />
          New Add-on
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active ({active.length})</CardTitle>
          <CardDescription>Visible to customers at checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading add-ons…</p>
          ) : active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No active add-ons yet. Click "New Add-on" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer-facing name</TableHead>
                  <TableHead>Internal name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((a) => (
                  <TableRow key={a.id} data-testid={`row-addon-${a.id}`}>
                    <TableCell className="font-medium" data-testid={`text-addon-display-${a.id}`}>
                      {a.displayName}
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-1">{a.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium" data-testid={`text-addon-price-${a.id}`}>
                      <span className="inline-flex items-center">
                        <DollarSign className="h-3 w-3" />
                        {Number(a.price).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(a)}
                          data-testid={`button-edit-addon-${a.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeactivate(a)}
                          data-testid={`button-deactivate-addon-${a.id}`}
                        >
                          <Power className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive ({inactive.length})</CardTitle>
            <CardDescription>
              Hidden from customers but preserved for historical orders. Reactivate any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer-facing name</TableHead>
                  <TableHead>Internal</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactive.map((a) => (
                  <TableRow key={a.id} className="opacity-60">
                    <TableCell>{a.displayName}</TableCell>
                    <TableCell className="font-mono text-xs">{a.name}</TableCell>
                    <TableCell className="text-right">${Number(a.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reactivateMutation.mutate(a.id)}
                        disabled={reactivateMutation.isPending}
                        data-testid={`button-reactivate-addon-${a.id}`}
                      >
                        Reactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Editor dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit add-on" : "New add-on"}</DialogTitle>
            <DialogDescription>
              {editing?.id
                ? "Changes go live immediately for new orders. Existing orders keep their original pricing."
                : "This will appear in the customer order flow as soon as you save."}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="addon-displayName">Customer-facing name</Label>
                <Input
                  id="addon-displayName"
                  data-testid="input-addon-display-name"
                  value={editing.displayName || ""}
                  onChange={(e) => setEditing({ ...editing, displayName: e.target.value })}
                  placeholder="Hypoallergenic detergent"
                />
                <p className="text-xs text-muted-foreground mt-1">What customers see at checkout.</p>
              </div>

              <div>
                <Label htmlFor="addon-name">Internal name (slug)</Label>
                <Input
                  id="addon-name"
                  data-testid="input-addon-name"
                  value={editing.name || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                    })
                  }
                  placeholder="hypoallergenic_detergent"
                  disabled={!!editing.id}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in code/reports. Lowercase, underscores. Cannot be changed after creation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="addon-price">Price (USD)</Label>
                  <Input
                    id="addon-price"
                    data-testid="input-addon-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editing.price ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="addon-category">Category</Label>
                  <Select
                    value={editing.category || "service"}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger id="addon-category" data-testid="select-addon-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="addon-description">Description (optional)</Label>
                <Textarea
                  id="addon-description"
                  data-testid="input-addon-description"
                  rows={3}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Gentle on sensitive skin. Free of dyes and perfumes."
                />
              </div>

              <div className="flex items-center gap-3 rounded-md border p-3">
                <Switch
                  id="addon-active"
                  data-testid="switch-addon-active"
                  checked={editing.isActive === 1}
                  onCheckedChange={(checked) =>
                    setEditing({ ...editing, isActive: checked ? 1 : 0 })
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="addon-active" className="cursor-pointer">
                    {editing.isActive === 1 ? "Active — visible to customers" : "Inactive — hidden"}
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-addon"
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <AlertDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this add-on?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDeactivate?.displayName}" will be hidden from new customer orders. Existing
              orders that already include it stay unchanged. You can reactivate it any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeactivate && deactivateMutation.mutate(confirmDeactivate.id)}
              data-testid="button-confirm-deactivate-addon"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
