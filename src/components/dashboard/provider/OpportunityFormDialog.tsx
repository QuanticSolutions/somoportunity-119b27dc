import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  SummarySection, DescriptionSection, EligibilitySection,
  BenefitsSection, ApplicationProcessSection, StipendTagsSection,
  emptyFormData, type OpportunityFormData,
} from "@/components/opportunity/OpportunityFormSections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editOpp: any | null;
  canPost: boolean;
  onSaved: () => void;
}

export default function OpportunityFormDialog({ open, onOpenChange, editOpp, canPost, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<OpportunityFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editOpp) {
      setForm({
        title: editOpp.title || "",
        category: editOpp.category || "job",
        work_mode: editOpp.work_mode || "onsite",
        location: editOpp.location || "",
        company: editOpp.company || "",
        description: editOpp.description || "",
        eligibility: editOpp.eligibility || [],
        benefits: editOpp.benefits || "",
        application_steps: editOpp.application_steps || [],
        compensation: editOpp.compensation || "",
        funding_amount: editOpp.funding_amount || "",
        official_website: editOpp.official_website || "",
        deadline: editOpp.deadline ? editOpp.deadline.split("T")[0] : "",
        external_link: editOpp.external_link || "",
        stipend_min: editOpp.stipend_min?.toString() || "",
        stipend_max: editOpp.stipend_max?.toString() || "",
        currency: editOpp.currency || "USD",
        tags: editOpp.tags || [],
      });
    } else {
      setForm(emptyFormData);
    }
  }, [editOpp, open]);

  const handleChange = (key: keyof OpportunityFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (asDraft = false) => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        category: form.category,
        work_mode: form.work_mode,
        location: form.location || null,
        company: form.company || null,
        description: form.description || null,
        eligibility: form.eligibility,
        benefits: form.benefits || null,
        application_steps: form.application_steps,
        compensation: form.compensation || null,
        funding_amount: form.funding_amount || null,
        official_website: form.official_website || null,
        deadline: form.deadline || null,
        external_link: form.external_link || null,
        stipend_min: form.stipend_min ? Number(form.stipend_min) : null,
        stipend_max: form.stipend_max ? Number(form.stipend_max) : null,
        currency: form.currency || "USD",
        tags: form.tags,
      };

      if (editOpp) {
        const { error } = await supabase.from("opportunities").update({
          ...payload,
          status: asDraft ? "draft" : editOpp.status === "draft" ? "pending" : editOpp.status,
        }).eq("id", editOpp.id);
        if (error) throw error;
        toast({ title: asDraft ? "Saved as draft" : "Opportunity updated" });
      } else {
        if (!asDraft && !canPost) {
          toast({ title: "Posting limit reached", description: "Upgrade your plan to post more.", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { error } = await supabase.from("opportunities").insert({
          ...payload,
          provider_id: user!.id,
          status: asDraft ? "draft" : "pending",
          views_count: 0,
        });
        if (error) throw error;
        toast({ title: asDraft ? "Saved as draft" : "Submitted for review" });
      }
      onSaved();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editOpp ? "Edit" : "Create"} Opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <SummarySection form={form} onChange={handleChange} />
          <DescriptionSection form={form} onChange={handleChange} />
          <EligibilitySection form={form} onChange={handleChange} />
          <BenefitsSection form={form} onChange={handleChange} />
          <ApplicationProcessSection form={form} onChange={handleChange} />
          <StipendTagsSection form={form} onChange={handleChange} />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={saving} className="flex-1 rounded-lg font-semibold">
              {saving ? "Saving…" : "Save as Draft"}
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg font-semibold">
              {saving ? "Saving…" : editOpp ? "Update" : "Submit for Review"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
