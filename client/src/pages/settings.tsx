import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, DollarSign, Bell, Key, Users } from "lucide-react";

export default function SettingsPage() {
  const { data: settings = [] } = useQuery<any[]>({ queryKey: ["/api/settings"] });
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => apiRequest("PATCH", `/api/settings/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Setting updated" });
    },
  });

  const getSetting = (key: string) => settings.find((s: any) => s.key === key)?.value || "";

  const pricingSettings = settings.filter((s: any) => s.category === "pricing");
  const operationsSettings = settings.filter((s: any) => s.category === "operations");
  const loyaltySettings = settings.filter((s: any) => s.category === "loyalty");

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1000px]">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration and management</p>
      </div>

      <Tabs defaultValue="pricing">
        <TabsList>
          <TabsTrigger value="pricing"><DollarSign className="h-3.5 w-3.5 mr-1" /> Pricing</TabsTrigger>
          <TabsTrigger value="operations"><SettingsIcon className="h-3.5 w-3.5 mr-1" /> Operations</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 mr-1" /> Notifications</TabsTrigger>
          <TabsTrigger value="api"><Key className="h-3.5 w-3.5 mr-1" /> API</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-3.5 w-3.5 mr-1" /> Team</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pricing Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {pricingSettings.map((s: any) => (
                <SettingRow key={s.key} label={formatSettingKey(s.key)} value={s.value} onSave={(v) => updateMutation.mutate({ key: s.key, value: v })} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Operations Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {operationsSettings.map((s: any) => (
                <SettingRow key={s.key} label={formatSettingKey(s.key)} value={s.value} onSave={(v) => updateMutation.mutate({ key: s.key, value: v })} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Loyalty Program Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {loyaltySettings.map((s: any) => (
                <SettingRow key={s.key} label={formatSettingKey(s.key)} value={s.value} onSave={(v) => updateMutation.mutate({ key: s.key, value: v })} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardContent className="p-6 text-center">
              <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Notification Templates</p>
              <p className="text-xs text-muted-foreground mt-1">Configure email, SMS, and push notification templates</p>
              <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
                {["Order Confirmation", "Pickup Scheduled", "Delivery Complete", "Promo Alert", "Dispute Update"].map(t => (
                  <div key={t} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                    <span>{t}</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardContent className="p-6 text-center">
              <Key className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">API Key Management</p>
              <p className="text-xs text-muted-foreground mt-1">Manage API keys for third-party integrations</p>
              <div className="mt-4 space-y-2 max-w-md mx-auto text-left">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                  <div>
                    <p className="font-medium">Production API Key</p>
                    <p className="text-xs text-muted-foreground font-mono">sk_live_•••••••••••••••</p>
                  </div>
                  <Badge variant="default" className="text-xs">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-sm">
                  <div>
                    <p className="font-medium">Test API Key</p>
                    <p className="text-xs text-muted-foreground font-mono">sk_test_•••••••••••••••</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Test</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium mb-3">Team Members</p>
              <div className="space-y-2">
                {[
                  { name: "Sarah Chen", role: "Admin", email: "sarah@offload.com" },
                  { name: "Michael Torres", role: "Manager", email: "michael@offload.com" },
                  { name: "Jessica Park", role: "Support", email: "jessica@offload.com" },
                ].map(member => (
                  <div key={member.email} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{member.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingRow({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value);
  const changed = val !== value;

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <Input value={val} onChange={e => setVal(e.target.value)} className="h-8" data-testid={`input-setting-${label.toLowerCase().replace(/\s/g, '-')}`} />
      </div>
      {changed && (
        <Button size="sm" onClick={() => onSave(val)} data-testid={`button-save-${label.toLowerCase().replace(/\s/g, '-')}`}>
          Save
        </Button>
      )}
    </div>
  );
}

function formatSettingKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
