import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadAvatar, getProfile, type AppRole } from "@/services/profile";
import { toast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/RichTextEditor";

const countries = [
  "Somalia", "Kenya", "Ethiopia", "Djibouti", "Uganda", "Tanzania",
  "Nigeria", "South Africa", "Egypt", "United States", "United Kingdom",
  "Canada", "Australia", "Germany", "France", "India", "Other",
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [country, setCountry] = useState(profile?.country || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  // Handle OAuth redirect — set role from localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem("signup_role") as AppRole | null;
    if (savedRole && user && profile && profile.role === "seeker" && savedRole !== "seeker") {
      console.log("[Onboarding] Setting saved role from localStorage:", savedRole);
      updateProfile(user.id, { role: savedRole }).then(() => {
        refreshProfile();
        localStorage.removeItem("signup_role");
      });
    }
  }, [user, profile]);

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile) {
      if (profile.country) setCountry(profile.country);
      if (profile.bio) setBio(profile.bio);
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Strip HTML to get plain text length for validation
  const getPlainTextLength = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim().length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!country) {
      toast({ title: "Country required", description: "Please select a country", variant: "destructive" });
      return;
    }
    const plainLength = getPlainTextLength(bio);
    if (plainLength < 10) {
      toast({ title: "Bio required", description: "Write at least 10 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let avatar_url = profile?.avatar_url || undefined;
      if (avatarFile) {
        avatar_url = await uploadAvatar(user.id, avatarFile);
      }

      // Preserve the current role — never overwrite it here
      await updateProfile(user.id, { country, bio, avatar_url });
      console.log("[Onboarding] Profile updated with country/bio");

      // Re-fetch profile from DB to get the confirmed role
      const freshProfile = await getProfile(user.id);
      console.log("[Onboarding] Fresh profile role:", freshProfile?.role);

      // Also refresh context
      await refreshProfile();

      toast({ title: "Profile complete! 🎉", description: "Welcome to Somopportunity" });

      const confirmedRole = freshProfile?.role || "seeker";
      console.log("[Onboarding] Redirecting based on role:", confirmedRole);

      // Clean up localStorage
      localStorage.removeItem("signup_role");

      if (confirmedRole === "provider") {
        navigate("/provider/subscribe", { replace: true });
      } else if (["admin", "editor", "viewer"].includes(confirmedRole)) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard/seeker", { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto w-full max-w-lg px-4 py-12"
      >
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-primary" />
        </div>

        <Card className="glass-card border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-extrabold">Complete your profile</CardTitle>
            <CardDescription>Step 3 of 3 — Almost there!</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-20 w-20 border-2 border-primary/30">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <Label htmlFor="avatar" className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Upload size={14} /> Upload photo
                </Label>
                <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Globe size={14} className="text-muted-foreground" /> Country
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bio — Rich Text Editor */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <FileText size={14} className="text-muted-foreground" /> Short bio
                </Label>
                <RichTextEditor
                  value={bio}
                  onChange={setBio}
                  placeholder="Write a short professional bio..."
                  maxLength={500}
                />
              </div>

              <Button type="submit" disabled={loading} className="btn-gradient w-full rounded-lg font-semibold" size="lg">
                {loading ? "Saving…" : "Complete Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
