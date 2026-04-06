import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-logger";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  SummarySection, DescriptionSection, EligibilitySection,
  BenefitsSection, ApplicationProcessSection, StipendTagsSection,
  emptyFormData, type OpportunityFormData,
} from "@/components/opportunity/OpportunityFormSections";

export default function AdminCreateOpportunity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OpportunityFormData>(emptyFormData);

  const handleChange = (key: keyof OpportunityFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (status: "active" | "draft") => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from("opportunities").insert({
        title: form.title,
        description: form.description || null,
        category: form.category,
        work_mode: form.work_mode,
        location: form.location || null,
        company: form.company || null,
        deadline: form.deadline || null,
        external_link: form.external_link || null,
        official_website: form.official_website || null,
        requirements: null,
        eligibility: form.eligibility,
        benefits: form.benefits || null,
        application_steps: form.application_steps,
        compensation: form.compensation || null,
        funding_amount: form.funding_amount || null,
        stipend_min: form.stipend_min ? Number(form.stipend_min) : null,
        stipend_max: form.stipend_max ? Number(form.stipend_max) : null,
        currency: form.currency,
        allow_internal_apply: true,
        tags: form.tags,
        status,
        provider_id: user?.id || null,
        is_verified: true,
      } as any).select().single();

      if (error) throw error;

      await logActivity("admin_created_opportunity", "opportunity", data?.id, { title: form.title, status });

      await supabase.from("admin_logs").insert({
        admin_id: user?.id,
        action: `Created opportunity: ${form.title}`,
        target_id: data?.id,
        target_type: "opportunity",
      });

      toast({ title: `Opportunity ${status === "active" ? "published" : "saved as draft"}` });
      navigate("/admin/opportunities");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/opportunities")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Opportunity</h1>
          <p className="text-sm text-muted-foreground">Admin-created opportunities bypass approval</p>
        </div>
      </div>

      <div className="space-y-6">
        <SummarySection form={form} onChange={handleChange} isAdmin />
        <DescriptionSection form={form} onChange={handleChange} />
        <EligibilitySection form={form} onChange={handleChange} />
        <BenefitsSection form={form} onChange={handleChange} />
        <ApplicationProcessSection form={form} onChange={handleChange} />
        <StipendTagsSection form={form} onChange={handleChange} />
      </div>

      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={saving} className="rounded-lg font-semibold">
          Save as Draft
        </Button>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold" onClick={() => handleSubmit("approved")} disabled={saving}>
          {saving ? "Publishing…" : "Publish Now"}
        </Button>
      </div>
    </div>
  );
}
