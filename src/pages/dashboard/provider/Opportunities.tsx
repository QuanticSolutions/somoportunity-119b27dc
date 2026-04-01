import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OpportunityFormDialog from "@/components/dashboard/provider/OpportunityFormDialog";
import WhatHappensNext from "@/components/WhatHappensNext";
import { logActivity } from "@/lib/activity-logger";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  active: "bg-emerald-100 text-emerald-700",
  rejected: "bg-destructive/10 text-destructive",
  inactive: "bg-muted text-muted-foreground",
  deleted: "bg-muted text-muted-foreground",
};

export default function Opportunities() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<any | null>(null);
  const [postingLimit, setPostingLimit] = useState<number | null>(null);
  const [subApproved, setSubApproved] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchOpps();
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    const { data } = await supabase
      .from("provider_subscriptions")
      .select("status, subscription_plans(posting_limit)")
      .eq("provider_id", user!.id)
      .single();
    if (data) {
      setSubApproved(data.status === "approved" || data.status === "active");
      setPostingLimit((data.subscription_plans as any)?.posting_limit ?? null);
    }
  };

  const fetchOpps = async () => {
    const { data } = await supabase
      .from("opportunities")
      .select("*, applications(id)")
      .eq("provider_id", user!.id)
      .order("created_at", { ascending: false });
    setOpps((data || []).map((o: any) => ({ ...o, apps_count: o.applications?.length ?? 0 })));
    setLoading(false);
  };

  const canPost = () => {
    if (!subApproved) return false;
    if (postingLimit === null) return true;
    return opps.filter(o => o.status !== "deleted").length < postingLimit;
  };

  const toggleStatus = async (id: string, current: string) => {
    const newStatus = current === "active" || current === "approved" ? "inactive" : "active";
    await supabase.from("opportunities").update({ status: newStatus }).eq("id", id);
    fetchOpps();
  };

  const deleteOpp = async (id: string) => {
    await supabase.from("opportunities").update({ status: "deleted" }).eq("id", id);
    toast({ title: "Opportunity removed" });
    fetchOpps();
  };

  const openEdit = (opp: any) => {
    setEditOpp(opp);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditOpp(null);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setDialogOpen(false);
    setEditOpp(null);
    fetchOpps();
  };

  const activeOpps = opps.filter(o => o.status !== "deleted");

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Opportunities</h1>
          <p className="text-sm text-muted-foreground">
            {postingLimit ? `${activeOpps.length} / ${postingLimit} used` : "Unlimited postings"}
          </p>
        </div>
        <Button className="btn-gradient rounded-lg font-semibold" disabled={!canPost()} onClick={openCreate}>
          <Plus size={18} className="mr-1" /> New Opportunity
        </Button>
      </div>

      {!subApproved && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            ⏳ Your subscription is pending admin approval. Opportunity posting will be unlocked once approved.
          </CardContent>
        </Card>
      )}

      {activeOpps.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            No opportunities yet. Create your first one!
          </CardContent>
        </Card>
      ) : (
        <Card className="glow-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Location</TableHead>
                <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Views</TableHead>
                <TableHead className="hidden lg:table-cell">Applicants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeOpps.map((opp, i) => (
                <motion.tr key={opp.id} className="border-b transition-colors hover:bg-muted/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <TableCell className="font-medium">{opp.title}</TableCell>
                  <TableCell className="hidden md:table-cell capitalize">{opp.category}</TableCell>
                  <TableCell className="hidden sm:table-cell">{opp.location || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{opp.deadline ? new Date(opp.deadline).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <Badge className={statusStyles[opp.status] || statusStyles.draft}>{opp.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{opp.views_count ?? 0}</TableCell>
                  <TableCell className="hidden lg:table-cell">{opp.apps_count ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(opp.id, opp.status)} title="Toggle visibility">
                        {opp.status === "active" || opp.status === "approved" ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(opp)} title="Edit">
                        <Pencil size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteOpp(opp.id)} title="Delete">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <OpportunityFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditOpp(null); }}
        editOpp={editOpp}
        canPost={canPost()}
        onSaved={handleSaved}
      />

      <WhatHappensNext />
    </div>
  );
}
