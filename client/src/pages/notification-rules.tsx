import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Bell, Plus, Pencil, Trash2 } from "lucide-react";

const TRIGGERS = [
  "driver_assigned",
  "picked_up",
  "at_facility",
  "processing",
  "ready_for_delivery",
  "driver_en_route_delivery",
  "delivered",
  "cancelled",
  "quote_created",
  "order_created",
  "review_request",
  "refund_issued",
  "dispute_opened",
] as const;

const AUDIENCES = ["customer", "driver", "vendor", "admin"] as const;

const CHANNEL_OPTIONS = [
  { value: "in_app", label: "In-App" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "push", label: "Push" },
] as const;

type NotificationRule = {
  id: number;
  name: string;
  trigger: string;
  audience: string;
  channels: string;
  titleTemplate: string;
  bodyTemplate: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

type RuleFormData = {
  name: string;
  trigger: string;
  audience: string;
  channels: string[];
  titleTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
};

const emptyForm: RuleFormData = {
  name: "",
  trigger: "delivered",
  audience: "customer",
  channels: ["in_app"],
  titleTemplate: "",
  bodyTemplate: "",
  isActive: true,
};

function parseChannels(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return ["in_app"];
  }
}

export default function NotificationRulesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(emptyForm);

  const { data: rules = [], isLoading } = useQuery<NotificationRule[]>({
    queryKey: ["/api/admin/notification-rules"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/notification-rules", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-rules"] });
      toast({ title: "Rule created" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to create rule", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/admin/notification-rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-rules"] });
      toast({ title: "Rule updated" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Failed to update rule", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/notification-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-rules"] });
      toast({ title: "Rule deleted" });
    },
    onError: () => toast({ title: "Failed to delete rule", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: number }) =>
      apiRequest("PATCH", `/api/admin/notification-rules/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notification-rules"] });
    },
    onError: () => toast({ title: "Failed to toggle rule", variant: "destructive" }),
  });

  function openCreate() {
    setEditingRule(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(rule: NotificationRule) {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      trigger: rule.trigger,
      audience: rule.audience,
      channels: parseChannels(rule.channels),
      titleTemplate: rule.titleTemplate,
      bodyTemplate: rule.bodyTemplate,
      isActive: rule.isActive === 1,
    });
    setDialogOpen(true);
  }

  function handleChannelChange(channel: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      channels: checked
        ? [...f.channels, channel]
        : f.channels.filter((c) => c !== channel),
    }));
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      trigger: form.trigger,
      audience: form.audience,
      channels: JSON.stringify(form.channels),
      titleTemplate: form.titleTemplate,
      bodyTemplate: form.bodyTemplate,
      isActive: form.isActive ? 1 : 0,
    };

    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Notification Rules</h1>
            <p className="text-sm text-muted-foreground">Configure automated notifications for order events</p>
          </div>
        </div>
        <Button data-testid="button-create-rule" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Rule
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground text-center">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-sm text-muted-foreground text-center">
              No notification rules yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} data-testid={`row-rule-${rule.id}`}>
                    <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {rule.trigger.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{rule.audience}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {parseChannels(rule.channels).map((ch) => (
                          <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        data-testid={`switch-active-${rule.id}`}
                        checked={rule.isActive === 1}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: rule.id, isActive: checked ? 1 : 0 })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          data-testid={`button-edit-${rule.id}`}
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          data-testid={`button-delete-${rule.id}`}
                          onClick={() => {
                            if (confirm(`Delete rule "${rule.name}"?`)) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Create Notification Rule"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                data-testid="input-rule-name"
                placeholder="e.g. Customer: driver assigned"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Trigger */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-trigger">Trigger</Label>
              <Select
                value={form.trigger}
                onValueChange={(v) => setForm((f) => ({ ...f, trigger: v }))}
              >
                <SelectTrigger id="rule-trigger" data-testid="select-rule-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Audience */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-audience">Audience</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => setForm((f) => ({ ...f, audience: v }))}
              >
                <SelectTrigger id="rule-audience" data-testid="select-rule-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((a) => (
                    <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex flex-wrap gap-4" data-testid="channels-group">
                {CHANNEL_OPTIONS.map(({ value, label }) => (
                  <div key={value} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`channel-${value}`}
                      data-testid={`checkbox-channel-${value}`}
                      checked={form.channels.includes(value)}
                      onCheckedChange={(checked) => handleChannelChange(value, !!checked)}
                    />
                    <Label htmlFor={`channel-${value}`} className="text-sm font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Title Template */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-title-template">Title Template</Label>
              <Input
                id="rule-title-template"
                data-testid="input-rule-title-template"
                placeholder='e.g. Order {{orderNumber}} delivered'
                value={form.titleTemplate}
                onChange={(e) => setForm((f) => ({ ...f, titleTemplate: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Available variables: <code className="bg-muted rounded px-1">{"{{orderNumber}}"}</code>{" "}
                <code className="bg-muted rounded px-1">{"{{customerName}}"}</code>{" "}
                <code className="bg-muted rounded px-1">{"{{statusLabel}}"}</code>
              </p>
            </div>

            {/* Body Template */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-body-template">Body Template</Label>
              <Textarea
                id="rule-body-template"
                data-testid="input-rule-body-template"
                placeholder="e.g. Thanks for using Offload, {{customerName}}!"
                value={form.bodyTemplate}
                onChange={(e) => setForm((f) => ({ ...f, bodyTemplate: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Available variables: <code className="bg-muted rounded px-1">{"{{orderNumber}}"}</code>{" "}
                <code className="bg-muted rounded px-1">{"{{customerName}}"}</code>{" "}
                <code className="bg-muted rounded px-1">{"{{statusLabel}}"}</code>
              </p>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <Switch
                id="rule-active"
                data-testid="switch-rule-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="rule-active" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              data-testid="button-cancel-rule"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-testid="button-save-rule"
              disabled={isSaving || !form.name || !form.titleTemplate || !form.bodyTemplate || form.channels.length === 0}
              onClick={handleSubmit}
            >
              {isSaving ? "Saving..." : editingRule ? "Save Changes" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
