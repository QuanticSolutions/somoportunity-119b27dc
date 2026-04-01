import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activity-logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const categories = ["job", "internship", "scholarship", "fellowship", "grant", "competition", "volunteer"];
const workModes = ["onsite", "remote", "hybrid"];

export default function AdminCreateOpportunity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "job",
    type: "job",
    work_mode: "onsite",
    location: "",
    company: "",
    deadline: "",
    external_link: "",
    requirements: "",
    stipend_min: "",
    stipend_max: "",
    currency: "USD",
    allow_internal_apply: true,
    tags: "",
  });

  const handleChange = (key: string, value: any) => {
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
        type: form.type,
        work_mode: form.work_mode,
        location: form.location || null,
        company: form.company || null,
        deadline: form.deadline || null,
        external_link: form.external_link || null,
        requirements: form.requirements || null,
        stipend_min: form.stipend_min ? Number(form.stipend_min) : null,
        stipend_max: form.stipend_max ? Number(form.stipend_max) : null,
        currency: form.currency,
        allow_internal_apply: form.allow_internal_apply,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
        status,
        provider_id: user?.id || null,
        is_verified: true,
      }).select().single();

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/opportunities")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Opportunity</h1>
          <p className="text-sm text-muted-foreground">Admin-created opportunities bypass approval</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opportunity Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="Opportunity title" />
            </div>
            <div className="space-y-2">
              <Label>Company / Organization</Label>
              <Input value={form.company} onChange={(e) => handleChange("company", e.target.value)} placeholder="Company name" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={5} placeholder="Full description..." />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => handleChange("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work Mode</Label>
              <Select value={form.work_mode} onValueChange={(v) => handleChange("work_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {workModes.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => handleChange("location", e.target.value)} placeholder="City, Country" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Stipend Min</Label>
              <Input type="number" value={form.stipend_min} onChange={(e) => handleChange("stipend_min", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stipend Max</Label>
              <Input type="number" value={form.stipend_max} onChange={(e) => handleChange("stipend_max", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={form.currency} onChange={(e) => handleChange("currency", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => handleChange("deadline", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>External Application Link</Label>
              <Input value={form.external_link} onChange={(e) => handleChange("external_link", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Requirements</Label>
            <Textarea value={form.requirements} onChange={(e) => handleChange("requirements", e.target.value)} rows={3} placeholder="Requirements..." />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => handleChange("tags", e.target.value)} placeholder="react, frontend, remote" />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.allow_internal_apply} onCheckedChange={(v) => handleChange("allow_internal_apply", v)} />
            <Label>Allow internal applications</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={saving}>
              Save as Draft
            </Button>
            <Button className="btn-gradient" onClick={() => handleSubmit("active")} disabled={saving}>
              {saving ? "Publishing…" : "Publish Now"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
