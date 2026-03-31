import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, Loader2, X } from "lucide-react";
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
const MAX_SIZE = 5 * 1024 * 1024;

export default function ApplicationForm({ opportunityId, opportunityTitle }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [files, setFiles] = useState<File[]>([]);
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
    setFiles((prev) => [...prev, f]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Please sign in to apply", variant: "destructive" });
      return;
    }
    if (files.length === 0) {
      toast({ title: "Please upload at least one document (resume)", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // 1. Create application record
      const { data: app, error: insertError } = await supabase
        .from("applications")
        .insert({
          opportunity_id: opportunityId,
          seeker_id: user.id,
          cover_letter: coverLetter || null,
        } as any)
        .select("id")
        .single();

      if (insertError) throw insertError;

      // 2. Upload files and insert document records
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const fileType = file.name.split(".").pop()?.toLowerCase() || "pdf";
        await supabase.from("application_documents").insert({
          application_id: (app as any).id,
          file_url: filePath,
          file_type: fileType,
        } as any);
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploading(false);
      setSubmitted(true);
      toast({ title: "Application submitted!", description: `Your application for "${opportunityTitle}" has been received.` });
    } catch (err: any) {
      if (err.code === "23505") {
        toast({ title: "Already applied", description: "You have already applied to this opportunity.", variant: "destructive" });
      } else {
        toast({ title: "Error submitting application", description: err.message, variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <Card className="glow-border">
        <CardContent className="py-8 text-center space-y-3">
          <h3 className="text-lg font-bold text-foreground">Sign in to Apply</h3>
          <p className="text-sm text-muted-foreground">You need an account to apply for opportunities.</p>
          <Button onClick={() => window.location.href = "/auth"} className="btn-gradient">Sign In</Button>
        </CardContent>
      </Card>
    );
  }

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
          <Label>Cover Letter</Label>
          <Textarea
            rows={5}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Tell us why you're a great fit..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Documents * (PDF, DOC, DOCX — max 5MB each)</Label>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <FileText size={18} className="text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(i)}>
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50"
          >
            <Upload size={20} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Click to upload documents</p>
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
      </CardContent>
    </Card>
  );
}
