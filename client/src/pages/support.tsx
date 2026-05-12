import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Clock, User, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  role: string;
  content: string;
  timestamp: string;
  adminId?: number;
  adminName?: string;
}

interface SupportSession {
  id: number;
  userId: number;
  orderId: number | null;
  status: string;
  topic: string | null;
  aiResolved: number;
  escalatedTo: number | null;
  messages: ChatMessage[];
  customerName: string;
  customerEmail: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function SupportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: sessions = [], isLoading } = useQuery<SupportSession[]>({
    queryKey: ["/api/admin/support-sessions"],
  });

  const replyMutation = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/chat/sessions/${sessionId}/reply`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support-sessions"] });
      setReplyContent("");
      toast({ title: "Reply sent", description: "Customer has been notified." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    },
  });

  const selected = sessions.find((s) => s.id === selectedSession);
  const escalatedCount = sessions.filter((s) => s.status === "escalated").length;
  const activeCount = sessions.filter((s) => s.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Support Inbox
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage escalated chat sessions and customer support requests
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive" className="text-xs">
            {escalatedCount} Escalated
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {activeCount} Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4" style={{ minHeight: "70vh" }}>
        {/* Session List */}
        <div className="col-span-4 space-y-2 overflow-auto" style={{ maxHeight: "75vh" }}>
          {isLoading ? (
            <Card className="p-4"><p className="text-muted-foreground text-sm">Loading sessions...</p></Card>
          ) : sessions.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No pending support sessions</p>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                  selectedSession === session.id ? "border-primary bg-accent" : ""
                }`}
                onClick={() => setSelectedSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium truncate">{session.customerName}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {session.topic || "General inquiry"}
                      {session.orderId ? ` (Order #${session.orderId})` : ""}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={session.status === "escalated" ? "destructive" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {session.status === "escalated" && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {session.status}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Chat View */}
        <div className="col-span-8">
          {selected ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selected.customerName}
                    {selected.customerEmail && (
                      <span className="text-muted-foreground text-xs ml-2">({selected.customerEmail})</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selected.orderId && (
                      <Badge variant="outline" className="text-xs">Order #{selected.orderId}</Badge>
                    )}
                    <Badge variant={selected.status === "escalated" ? "destructive" : "secondary"} className="text-xs">
                      {selected.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4 space-y-3" style={{ maxHeight: "50vh" }}>
                {selected.messages.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No messages in this session</p>
                ) : (
                  selected.messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "admin"
                            ? "bg-primary text-primary-foreground"
                            : msg.role === "assistant"
                            ? "bg-blue-500/15 text-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <p className="text-[10px] font-medium mb-1 opacity-70">
                          {msg.role === "admin"
                            ? msg.adminName || "Admin"
                            : msg.role === "assistant"
                            ? "AI Assistant"
                            : "Customer"}
                        </p>
                        <p>{msg.content}</p>
                        {msg.timestamp && (
                          <p className="text-[9px] opacity-50 mt-1 text-right">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[60px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && replyContent.trim()) {
                        e.preventDefault();
                        replyMutation.mutate({ sessionId: selected.id, content: replyContent.trim() });
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!replyContent.trim() || replyMutation.isPending}
                    onClick={() => replyMutation.mutate({ sessionId: selected.id, content: replyContent.trim() })}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Select a session to view the conversation</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
