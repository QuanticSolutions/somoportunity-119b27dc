import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserCheck, Calendar, XCircle, CheckCircle, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const statusOptions = ["submitted", "shortlisted", "interview", "hired", "denied"];
const statusColor: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  shortlisted: "bg-amber-100 text-amber-700",
  interview: "bg-violet-100 text-violet-700",
  hired: "bg-emerald-100 text-emerald-700",
  denied: "bg-destructive/10 text-destructive",
};

export default function Applicants() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpp, setFilterOpp] = useState<string>("all");
  const [opps, setOpps] = useState<any[]>([]);
  const [emailModal, setEmailModal] = useState<{ open: boolean; recipientId: string; name: string }>({ open: false, recipientId: "", name: "" });
  const [emailForm, setEmailForm] = useState({ subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: myOpps } = await supabase
      .from("opportunities")
      .select("id, title")
      .eq("provider_id", user!.id);

    setOpps(myOpps || []);
    const oppIds = myOpps?.map(o => o.id) || [];

    if (oppIds.length === 0) {
      setApplicants([]);
      setLoading(false);
      return;
    }

    const { data: apps } = await supabase
      .from("applications")
      .select("*, profiles!applications_user_id_fkey(full_name, avatar_url, bio, country)")
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false });

    const oppMap = new Map(myOpps?.map(o => [o.id, o.title]) || []);
    setApplicants(
      (apps || []).map(a => ({ ...a, opportunity_title: oppMap.get(a.opportunity_id) || "Unknown" }))
    );
    setLoading(false);
  };

  const viewResume = async (resumeUrl: string) => {
    if (!resumeUrl) {
      toast({ title: "No resume uploaded", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resumeUrl, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not access resume", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const updateStatus = async (appId: string, status: string) => {
    await supabase.from("applications").update({ status }).eq("id", appId);
    toast({ title: `Status updated to ${status}` });
    fetchData();
  };

  const sendMessage = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    setSendingEmail(true);
    try {
      await supabase.from("messages").insert({
        sender_id: user!.id,
        recipient_id: emailModal.recipientId,
        subject: emailForm.subject,
        body: emailForm.message,
      });
      toast({ title: "Message sent" });
      setEmailModal({ open: false, recipientId: "", name: "" });
      setEmailForm({ subject: "", message: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingEmail(false);
    }
  };

  const filtered = filterOpp === "all" ? applicants : applicants.filter(a => a.opportunity_id === filterOpp);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-foreground">Applicants</h1>
        <Select value={filterOpp} onValueChange={setFilterOpp}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by opportunity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Opportunities</SelectItem>
            {opps.map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            No applicants found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="glow-border">
                <CardContent className="flex items-start gap-4 py-4">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={(a.profiles as any)?.avatar_url || ""} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-sm font-bold">
                      {((a.profiles as any)?.full_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">{(a as any).name || (a.profiles as any)?.full_name || "Unknown"}</h3>
                    <p className="text-sm text-muted-foreground">{a.opportunity_title}</p>
                    {(a as any).email && <p className="text-xs text-muted-foreground">{(a as any).email}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {(a.profiles as any)?.country} · Applied {new Date(a.created_at).toLocaleDateString()}
                    </p>
                    {a.cover_letter && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.cover_letter}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={statusColor[a.status] || ""}>{a.status}</Badge>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {statusOptions.filter(s => s !== a.status).map(s => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className="text-xs capitalize"
                          onClick={() => updateStatus(a.id, s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailModal({ open: true, recipientId: a.user_id, name: (a.profiles as any)?.full_name || "Applicant" })}
                    >
                      <Mail size={14} className="mr-1" /> Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Email Modal */}
      <Dialog open={emailModal.open} onOpenChange={(o) => setEmailModal(m => ({ ...m, open: o }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {emailModal.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={5} value={emailForm.message} onChange={e => setEmailForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <Button onClick={sendMessage} disabled={sendingEmail} className="btn-gradient w-full rounded-lg font-semibold">
              {sendingEmail ? "Sending…" : "Send Message"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
