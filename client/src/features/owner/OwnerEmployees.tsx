import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, UserCheck, Trash2 } from "lucide-react";
import { SkeletonList } from "@/features/shared/components";

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  joined_at: string | null;
}

export default function OwnerEmployees() {
  const { toast } = useToast();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/laundromats/me/employees"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/laundromats/me/employees");
        return res.json();
      } catch {
        return [];
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/laundromats/me/employees/invite", {
        email: inviteEmail,
        name: inviteName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats/me/employees"] });
      toast({ title: "Employee invited" });
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (employeeId: number) => {
      const res = await apiRequest("DELETE", `/api/laundromats/me/employees/${employeeId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/laundromats/me/employees"] });
      toast({ title: "Employee removed" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your laundromat staff</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(!showInvite)}>
          <Plus className="h-4 w-4 mr-1" /> Invite
        </Button>
      </div>

      {showInvite && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold">Invite Employee</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="employee@example.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Employee Name"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => inviteMutation.mutate()}
              disabled={!inviteEmail || !inviteName || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <SkeletonList count={3} />
      ) : (employees ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No employees yet</p>
          <p className="text-xs mt-1">Invite employees to help manage your laundromat</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(employees ?? []).map((emp) => (
            <div key={emp.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5B4BC4]/10 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-[#5B4BC4]" />
                </div>
                <div>
                  <div className="font-medium text-sm">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${emp.active ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"}`}>
                  {emp.active ? "Active" : "Inactive"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeMutation.mutate(emp.id)}
                  disabled={removeMutation.isPending}
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
