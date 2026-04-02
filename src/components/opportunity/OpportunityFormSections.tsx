import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RichTextEditor from "@/components/RichTextEditor";
import { Plus, X, GripVertical, FileText, CheckCircle, ListChecks, Gift, Route } from "lucide-react";

const categories = ["job", "internship", "scholarship", "fellowship", "grant", "competition", "volunteer"];
const workModes = ["onsite", "remote", "hybrid"];

export interface OpportunityFormData {
  title: string;
  company: string;
  category: string;
  deadline: string;
  funding_amount: string;
  compensation: string;
  location: string;
  official_website: string;
  work_mode: string;
  description: string;
  eligibility: string[];
  benefits: string;
  application_steps: { title: string; description: string }[];
  external_link: string;
  stipend_min: string;
  stipend_max: string;
  currency: string;
  tags: string[];
}

export const emptyFormData: OpportunityFormData = {
  title: "", company: "", category: "job", deadline: "", funding_amount: "",
  compensation: "", location: "", official_website: "", work_mode: "onsite",
  description: "", eligibility: [], benefits: "", application_steps: [],
  external_link: "", stipend_min: "", stipend_max: "", currency: "USD", tags: [],
};

interface SectionProps {
  form: OpportunityFormData;
  onChange: (key: keyof OpportunityFormData, value: any) => void;
  isAdmin?: boolean;
}

// ─── Section 1: Opportunity Summary ────────────────────────────────────────
export function SummarySection({ form, onChange, isAdmin }: SectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText size={16} />
          </div>
          <CardTitle className="text-lg">Opportunity Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Opportunity Title *">
            <Input value={form.title} onChange={(e) => onChange("title", e.target.value)} placeholder="e.g., Software Engineering Internship" />
          </Field>
          <Field label={isAdmin ? "Provider / Organization" : "Organization Name"}>
            <Input value={form.company} onChange={(e) => onChange("company", e.target.value)} placeholder="Organization name" />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => onChange("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Work Mode">
            <Select value={form.work_mode} onValueChange={(v) => onChange("work_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {workModes.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Application Deadline">
            <Input type="date" value={form.deadline} onChange={(e) => onChange("deadline", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Funding Amount">
            <Input value={form.funding_amount} onChange={(e) => onChange("funding_amount", e.target.value)} placeholder="e.g., $5,000" />
          </Field>
          <Field label="Compensation">
            <Input value={form.compensation} onChange={(e) => onChange("compensation", e.target.value)} placeholder="e.g., $25/hr" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => onChange("location", e.target.value)} placeholder="City, Country" />
          </Field>
        </div>
        <Field label="Official Website Link">
          <Input value={form.official_website} onChange={(e) => onChange("official_website", e.target.value)} placeholder="https://..." />
        </Field>
      </CardContent>
    </Card>
  );
}

// ─── Section 2: Summary of Opportunity (Rich Text) ────────────────────────
export function DescriptionSection({ form, onChange }: SectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckCircle size={16} />
          </div>
          <div>
            <CardTitle className="text-lg">Summary of Opportunity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Provide a detailed description with formatting</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RichTextEditor
          value={form.description}
          onChange={(html) => onChange("description", html)}
          placeholder="Describe the opportunity in detail..."
        />
      </CardContent>
    </Card>
  );
}

// ─── Section 3: Eligibility Criteria (Dynamic) ────────────────────────────
export function EligibilitySection({ form, onChange }: SectionProps) {
  const [input, setInput] = useState("");

  const addItem = () => {
    const val = input.trim();
    if (val && !form.eligibility.includes(val)) {
      onChange("eligibility", [...form.eligibility, val]);
    }
    setInput("");
  };

  const removeItem = (idx: number) => {
    onChange("eligibility", form.eligibility.filter((_, i) => i !== idx));
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addItem(); }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ListChecks size={16} />
          </div>
          <div>
            <CardTitle className="text-lg">Eligibility Criteria</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Add requirements that applicants must meet</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g., Minimum 3.0 CGPA"
            className="flex-1"
          />
          <Button type="button" variant="outline" onClick={addItem} className="gap-1 shrink-0">
            <Plus size={14} /> Add Requirement
          </Button>
        </div>
        {form.eligibility.length > 0 && (
          <div className="space-y-2">
            {form.eligibility.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 group">
                <GripVertical size={14} className="text-muted-foreground/50" />
                <span className="flex-1 text-sm">{item}</span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {form.eligibility.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No eligibility criteria added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section 4: Benefits (Optional) ───────────────────────────────────────
export function BenefitsSection({ form, onChange }: SectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gift size={16} />
          </div>
          <div>
            <CardTitle className="text-lg">Benefits <span className="text-muted-foreground font-normal text-sm">(Optional)</span></CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">List any benefits, perks, or incentives</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={form.benefits}
          onChange={(e) => onChange("benefits", e.target.value)}
          rows={4}
          placeholder="e.g., Fully funded tuition, Monthly stipend of $1,500, Travel allowance..."
        />
      </CardContent>
    </Card>
  );
}

// ─── Section 5: Application Process (Dynamic Steps) ───────────────────────
export function ApplicationProcessSection({ form, onChange }: SectionProps) {
  const steps = form.application_steps;

  const addStep = () => {
    onChange("application_steps", [...steps, { title: "", description: "" }]);
  };

  const updateStep = (idx: number, key: "title" | "description", val: string) => {
    const updated = steps.map((s, i) => i === idx ? { ...s, [key]: val } : s);
    onChange("application_steps", updated);
  };

  const removeStep = (idx: number) => {
    onChange("application_steps", steps.filter((_, i) => i !== idx));
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Route size={16} />
          </div>
          <div>
            <CardTitle className="text-lg">Application Process</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Define the steps applicants need to follow</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 group relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">Step {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeStep(idx)}
                className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
            <Input
              value={step.title}
              onChange={(e) => updateStep(idx, "title", e.target.value)}
              placeholder={`e.g., Step ${idx + 1}: Initial Screening`}
              className="font-medium"
            />
            <Textarea
              value={step.description}
              onChange={(e) => updateStep(idx, "description", e.target.value)}
              placeholder="Describe this step (optional)..."
              rows={2}
            />
          </div>
        ))}
        <Button type="button" variant="outline" onClick={addStep} className="w-full gap-1 border-dashed">
          <Plus size={14} /> Add Step
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Stipend & Tags Section ───────────────────────────────────────────────
export function StipendTagsSection({ form, onChange }: SectionProps) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      onChange("tags", [...form.tags, tag]);
    }
    setTagInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Additional Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Stipend Min">
            <Input type="number" value={form.stipend_min} onChange={(e) => onChange("stipend_min", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Stipend Max">
            <Input type="number" value={form.stipend_max} onChange={(e) => onChange("stipend_max", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => onChange("currency", e.target.value)} />
          </Field>
        </div>
        <Field label="External Application Link">
          <Input value={form.external_link} onChange={(e) => onChange("external_link", e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Tags">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleKey} placeholder="Type a tag and press Enter" className="flex-1" />
              <Button type="button" variant="outline" size="sm" onClick={addTag} className="shrink-0">Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button type="button" onClick={() => onChange("tags", form.tags.filter((t) => t !== tag))} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

// ─── Shared Field component ───────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
