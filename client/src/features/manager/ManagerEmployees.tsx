import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Truck,
  WashingMachine,
  Crown,
  Mail,
  Phone,
  Calendar,
  Clock,
  Copy,
  AlertTriangle,
  Trash2,
  UserMinus,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader, SkeletonList, EmptyState } from "@/features/shared/components";
import type { VendorEmployee } from "@/features/shared/types";
import { EMPLOYEE_PERMISSIONS } from "@/features/shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Types ───
type EmployeeRole = "driver" | "operator" | "manager";

interface CreateEmployeeForm {
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  permissions: number; // bitmask
}


// ─── Helpers ───
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

function getRoleIcon(role: EmployeeRole) {
  switch (role) {
    case "driver":
      return <Truck className="w-4 h-4" />;
    case "operator":
      return <WashingMachine className="w-4 h-4" />;
    case "manager":
      return <Crown className="w-4 h-4" />;
  }
}

function getRoleLabel(role: EmployeeRole): string {
  switch (role) {
    case "driver":
      return "Driver";
    case "operator":
      return "Operator";
    case "manager":
      return "Manager";
  }
}

const ROLE_OPTIONS: { key: EmployeeRole; label: string }[] = [
  { key: "driver", label: "Driver" },
  { key: "operator", label: "Operator" },
  { key: "manager", label: "Manager" },
];

// Permission bitmask helpers
function hasPermission(bitmask: number, bit: number): boolean {
  return (bitmask & bit) !== 0;
}

function toggleBit(bitmask: number, bit: number): number {
  return bitmask ^ bit;
}

export default function ManagerEmployees() {
  const { toast } = useToast();

  // ─── State ───
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorEmployee | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [form, setForm] = useState<CreateEmployeeForm>({
    name: "",
    email: "",
    phone: "",
    role: "driver",
    permissions: 1, // view_orders by default
  });

  // ─── Data ───
  const { data: employees, isLoading } = useQuery<VendorEmployee[]>({
    queryKey: ["/api/vendor-employees"],
  });

  const emps = employees ?? [];

  // ─── Grouped counts ───
  const driverCount = emps.filter((e) => e.role === "driver").length;
  const operatorCount = emps.filter((e) => e.role === "operator").length;
  const managerCount = emps.filter((e) => e.role === "manager").length;

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: async (data: CreateEmployeeForm & { tempPassword: string }) => {
      const res = await apiRequest("POST", "/api/vendor-employees", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        permissions: data.permissions,
        tempPassword: data.tempPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-employees"] });
      toast({ title: "Employee added successfully." });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to add employee.", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/vendor-employees/${id}`, { isActive: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-employees"] });
      toast({ title: "Employee deactivated." });
    },
    onError: () => {
      toast({ title: "Failed to deactivate employee.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vendor-employees/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-employees"] });
      toast({ title: "Employee deleted." });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete employee.", variant: "destructive" });
    },
  });

  // ─── Form helpers ───
  function resetForm() {
    setForm({ name: "", email: "", phone: "", role: "driver", permissions: 1 });
    setTempPassword("");
    setPasswordCopied(false);
  }

  function openAddDialog() {
    resetForm();
    setTempPassword(generateTempPassword());
    setAddDialogOpen(true);
  }

  function togglePermission(bit: number) {
    setForm((prev) => ({
      ...prev,
      permissions: toggleBit(prev.permissions, bit),
    }));
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy to clipboard.", variant: "destructive" });
    }
  }

  // ─── Group employees by role ───
  function renderGroup(role: EmployeeRole, label: string) {
    const group = emps.filter((e) => e.role === role);
    if (group.length === 0) return null;
    return (
      <div key={role}>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
          {getRoleIcon(role)}
          {label} ({group.length})
        </h3>
        <div className="space-y-2 mb-4">
          {group.map((emp) => (
            <div key={emp.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">{emp.name}</p>
                    {emp.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      <span>{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      <span>{emp.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>Joined {new Date(emp.joined_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>
                        {emp.last_login_at
                          ? `Last login ${new Date(emp.last_login_at).toLocaleString()}`
                          : "Never logged in"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {emp.active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-400 hover:text-orange-300"
                      onClick={() => deactivateMutation.mutate(emp.id)}
                      disabled={deactivateMutation.isPending}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => {
                      setDeleteTarget(emp);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <SectionHeader
        title="Employees"
        action={
          <Button size="sm" onClick={openAddDialog}>
            <UserPlus className="w-4 h-4 mr-1" />
            Add Employee
          </Button>
        }
      />

      {/* ─── Team Overview ─── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Team Overview</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Truck className="w-4 h-4 text-blue-400" />
              <span className="text-xl font-bold">{driverCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Drivers</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <WashingMachine className="w-4 h-4 text-purple-400" />
              <span className="text-xl font-bold">{operatorCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Wash Operators</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xl font-bold">{managerCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">Managers</span>
          </div>
        </div>
      </div>

      {/* ─── Employee List ─── */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : emps.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add your first team member to get started."
          icon={<Users className="w-10 h-10" />}
        />
      ) : (
        <div>
          {renderGroup("driver", "Drivers")}
          {renderGroup("operator", "Operators")}
          {renderGroup("manager", "Managers")}
        </div>
      )}

      {/* ─── Add Employee Dialog ─── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">Name</Label>
              <Input
                id="emp-name"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                placeholder="employee@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input
                id="emp-phone"
                type="tel"
                placeholder="555-0100"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            {/* Role Chips */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="flex gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: opt.key }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      form.role === opt.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Temp Password */}
            <div className="space-y-1.5">
              <Label>Temporary Password</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                  {tempPassword}
                </code>
                <Button size="sm" variant="outline" onClick={copyPassword}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {passwordCopied && (
                <p className="text-xs text-green-400">Copied to clipboard!</p>
              )}
              <div className="flex items-start gap-2 p-2 rounded-md bg-orange-500/10 border border-orange-500/20 mt-1">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300">
                  This password will only be shown once. Make sure to share it securely with the employee.
                </p>
              </div>
            </div>

            {/* Permissions (bitmask) */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {EMPLOYEE_PERMISSIONS.map((perm) => (
                  <div key={perm.bit} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${perm.bit}`}
                      checked={hasPermission(form.permissions, perm.bit)}
                      onCheckedChange={() => togglePermission(perm.bit)}
                    />
                    <label
                      htmlFor={`perm-${perm.bit}`}
                      className="text-sm cursor-pointer"
                    >
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!form.name || !form.email || createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  ...form,
                  tempPassword,
                })
              }
            >
              {createMutation.isPending ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.name}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
