import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Shield, UserCheck } from "lucide-react";

interface UserRecord {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  laundromat_id?: string;
}

const ROLE_OPTIONS = ["customer", "driver", "laundromat_owner", "laundromat_employee", "super_admin"];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-500",
  admin: "bg-red-500/10 text-red-500",
  laundromat_owner: "bg-[#7C3AED]/10 text-[#7C3AED]",
  laundromat_employee: "bg-blue-500/10 text-blue-500",
  driver: "bg-orange-500/10 text-orange-500",
  customer: "bg-gray-500/10 text-gray-500",
  manager: "bg-[#7C3AED]/10 text-[#7C3AED]",
};

export default function SuperUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [changingRole, setChangingRole] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users", search],
    queryFn: async () => {
      const q = search ? `?q=${encodeURIComponent(search)}` : "";
      const res = await apiRequest("GET", `/api/admin/users${q}`);
      const data = await res.json();
      // Handle both array and paginated { data: [...] } response shapes
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated" });
      setChangingRole(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">Search users and manage role assignments</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or username..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{search ? "No users match your search" : "No users found"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(users ?? []).map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-[#7C3AED]" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {changingRole === u.id ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {ROLE_OPTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => roleMutation.mutate({ userId: u.id, role: r })}
                          disabled={roleMutation.isPending}
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${
                            r === u.role
                              ? "bg-[#7C3AED] text-white"
                              : "bg-muted hover:bg-muted/80 text-muted-foreground"
                          }`}
                        >
                          {r.replace(/_/g, " ")}
                        </button>
                      ))}
                      <button
                        onClick={() => setChangingRole(null)}
                        className="text-xs text-muted-foreground hover:text-foreground ml-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || "bg-muted text-muted-foreground"}`}>
                        {u.role.replace(/_/g, " ")}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setChangingRole(u.id)}
                        className="text-xs h-7"
                      >
                        <Shield className="h-3 w-3 mr-1" /> Change Role
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
