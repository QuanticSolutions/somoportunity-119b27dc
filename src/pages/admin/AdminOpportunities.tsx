import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Loader2 } from "lucide-react";
import {
  SummarySection, DescriptionSection, EligibilitySection,
  BenefitsSection, ApplicationProcessSection, StipendTagsSection,
  emptyFormData, type OpportunityFormData,
} from "@/components/opportunity/OpportunityFormSections";

export default function AdminOpportunities() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editOpp, setEditOpp] = useState<any>(null);
  const [form, setForm] = useState<OpportunityFormData>(emptyFormData);
  const [submitting, setSubmitting] = useState(false);

  const fetchOpps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("opportunities")
      .select("*, profiles!opportunities_provider_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setOpps(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOpps(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("opportunities").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("admin_logs").insert({
      admin_id: user?.id, action: `Opportunity ${status}`, target_id: id, target_type: "opportunity",
    });
    toast({ title: `Opportunity ${status}` });
    fetchOpps();
  };

  const handleChange = (key: keyof OpportunityFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openEdit = (opp: any) => {
    setEditOpp(opp);
    setForm({
      title: opp.title || "",
      company: opp.company || "",
      category: opp.category || "job",
      deadline: opp.deadline ? new Date(opp.deadline).toISOString().split("T")[0] : "",
      funding_amount: opp.funding_amount || "",
      compensation: opp.compensation || "",
      location: opp.location || "",
      official_website: opp.official_website || "",
      work_mode: opp.work_mode || "onsite",
      description: opp.description || "",
      eligibility: opp.eligibility || [],
      benefits: opp.benefits || "",
      application_steps: opp.application_steps || [],
      external_link: opp.external_link || "",
      stipend_min: opp.stipend_min?.toString() || "",
      stipend_max: opp.stipend_max?.toString() || "",
      currency: opp.currency || "USD",
      tags: opp.tags || [],
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editOpp) return;
    setSubmitting(true);
    const { error } = await supabase.from("opportunities").update({
      title: form.title,
      company: form.company || null,
      category: form.category,
      deadline: form.deadline || null,
      funding_amount: form.funding_amount || null,
      compensation: form.compensation || null,
      location: form.location || null,
      official_website: form.official_website || null,
      work_mode: form.work_mode,
      description: form.description || null,
      eligibility: form.eligibility,
      benefits: form.benefits || null,
      application_steps: form.application_steps,
      external_link: form.external_link || null,
      stipend_min: form.stipend_min ? Number(form.stipend_min) : null,
      stipend_max: form.stipend_max ? Number(form.stipend_max) : null,
      currency: form.currency,
      tags: form.tags,
    }).eq("id", editOpp.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Opportunity updated successfully" });
      setEditOpen(false);
      fetchOpps();
    }
    setSubmitting(false);
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunity Management</h1>
          <p className="text-sm text-muted-foreground">Manage all opportunities on the platform</p>
        </div>
        <Button className="btn-gradient" onClick={() => navigate("/admin/opportunities/create")}>
          <Plus size={18} className="mr-1" /> Create Opportunity
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Opportunities ({opps.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opps.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-medium max-w-48 truncate">{opp.title}</TableCell>
                    <TableCell>{(opp.profiles as any)?.full_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{opp.category}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(opp.status)}>{opp.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{opp.deadline ? new Date(opp.deadline).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(opp.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(opp)}><Pencil size={14} className="mr-1" /> Edit</Button>
                        {opp.status !== "approved" && (
                          <Button size="sm" onClick={() => updateStatus(opp.id, "approved")}>Approve</Button>
                        )}
                        {opp.status !== "rejected" && (
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(opp.id, "rejected")}>Reject</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Full Edit Dialog using same form sections */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
            <DialogDescription>Update all opportunity details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <SummarySection form={form} onChange={handleChange} isAdmin />
            <DescriptionSection form={form} onChange={handleChange} />
            <EligibilitySection form={form} onChange={handleChange} />
            <BenefitsSection form={form} onChange={handleChange} />
            <ApplicationProcessSection form={form} onChange={handleChange} />
            <StipendTagsSection form={form} onChange={handleChange} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
