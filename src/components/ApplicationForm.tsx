import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, Loader2, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateFile, uploadFileWithRetry } from "@/lib/upload-utils";
import { logError } from "@/lib/error-logger";

interface Props {
  opportunityId: string;
  opportunityTitle: string;
}

export default function ApplicationForm({ opportunityId, opportunityTitle }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const validation = validateFile(f);
    if (!validation.valid) {
      toast({ title: "Invalid file", description: validation.error, variant: "destructive" });
      return;
    }
    setFiles((prev) => [...prev, f]);
    setUploadError(null);
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
    setUploadError(null);
    setUploadProgress(0);

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

      // 2. Upload files with retry logic
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const result = await uploadFileWithRetry("resumes", filePath, file);

        if (!result.success) {
          setUploadError(result.error || "Upload failed. Please try again.");
          toast({
            title: "Upload failed",
            description: `Failed to upload "${file.name}". ${result.error}`,
            variant: "destructive",
          });
          // Clean up: we can't easily rollback the application, but log it
          logError(new Error(result.error), {
            component: "ApplicationForm",
            action: "file_upload",
            fileName: file.name,
            opportunityId,
          });
          setSubmitting(false);
          setUploading(false);
          return;
        }

        const fileType = file.name.split(".").pop()?.toLowerCase() || "pdf";
        await supabase.from("application_documents").insert({
          application_id: (app as any).id,
          file_url: filePath,
          file_type: fileType,
        } as any);

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      setUploading(false);
      setSubmitted(true);
      toast({ title: "Application submitted!", description: `Your application for "${opportunityTitle}" has been received.` });
    } catch (err: any) {
      if (err.code === "23505") {
        toast({ title: "Already applied", description: "You have already applied to this opportunity.", variant: "destructive" });
      } else {
        const msg = err.message || "Something went wrong. Please try again.";
        setUploadError(msg);
        toast({ title: "Error submitting application", description: msg, variant: "destructive" });
        logError(err, { component: "ApplicationForm", action: "submit", opportunityId });
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
                  <Button variant="ghost" size="sm" onClick={() => removeFile(i)} disabled={submitting}>
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => !submitting && fileRef.current?.click()}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50 hover:bg-accent/50 ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Upload size={20} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">Click to upload documents</p>
          </div>

          {uploading && <Progress value={uploadProgress} className="h-2" />}

          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive flex-1">{uploadError}</p>
              <Button variant="outline" size="sm" onClick={handleSubmit} className="shrink-0">
                <RefreshCw size={14} className="mr-1" /> Retry
              </Button>
            </div>
          )}
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
