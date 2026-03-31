import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  opportunityId: string;
  opportunityTitle: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function ApplicationForm({ opportunityId, opportunityTitle }: Props) {
  const { user, profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: profile?.full_name || "",
    email: "",
    phone: "",
    cover_letter: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, DOC, or DOCX.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    if (!file) {
      toast({ title: "Resume is required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // Upload resume
      const userId = user?.id || "guest";
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}-${file.name}`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      setUploading(false);

      // Insert application
      const { error: insertError } = await supabase.from("applications").insert({
        opportunity_id: opportunityId,
        user_id: user?.id || undefined,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        cover_letter: form.cover_letter || null,
        resume_url: filePath,
        status: "submitted",
      } as any);

      if (insertError) throw insertError;

      setSubmitted(true);
      toast({ title: "Application submitted!", description: `Your application for "${opportunityTitle}" has been received.` });
    } catch (err: any) {
      toast({ title: "Error submitting application", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <Card className="glow-border">
        <CardContent className="py-8 text-center space-y-3">
          <CheckCircle size={40} className="mx-auto text-emerald-500" />
          <h3 className="text-lg font-bold text-foreground">Application Submitted!</h3>
          <p className="text-sm text-muted-foreground">We've received your application. You'll be notified of any updates.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-border">
      <CardHeader>
        <CardTitle className="text-lg">Apply for this Opportunity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
        </div>
        <div className="space-y-1.5">
          <Label>Email *</Label>
          <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="space-y-1.5">
          <Label>Cover Letter</Label>
          <Textarea rows={4} value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} placeholder="Tell us why you're a great fit..." />
        </div>
        <div className="space-y-1.5">
          <Label>Resume * (PDF, DOC, DOCX — max 5MB)</Label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            {file ? (
              <>
                <FileText size={20} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </>
            ) : (
              <>
                <Upload size={20} className="text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">Click to upload your resume</p>
              </>
            )}
          </div>
          {uploading && <Progress value={uploadProgress} className="h-2" />}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-gradient w-full rounded-lg font-semibold text-base py-5"
        >
          {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" /> Submitting...</> : "Submit Application"}
        </Button>

        {!user && (
          <p className="text-xs text-muted-foreground text-center">
            You're applying as a guest. <a href="/signup" className="text-primary underline">Sign up</a> to track your applications.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
