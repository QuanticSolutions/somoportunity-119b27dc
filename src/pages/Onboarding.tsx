import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, Globe, FileText, Phone, Mail, Building2 } from "lucide-react";
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

const orgTypes = [
  { value: "company", label: "Company" },
  { value: "ngo", label: "NGO" },
  { value: "government", label: "Government" },
  { value: "startup", label: "Startup" },
  { value: "university", label: "University" },
  { value: "other", label: "Other" },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [country, setCountry] = useState(profile?.country || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || user?.email || "");
  const [organizationType, setOrganizationType] = useState(profile?.organization_type || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  // Handle OAuth redirect — set role from localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem("signup_role") as AppRole | null;
    if (savedRole && user && profile && profile.role === "seeker" && savedRole !== "seeker") {
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
      if (profile.phone) setPhone(profile.phone);
      if (profile.email) setEmail(profile.email);
      else if (user?.email) setEmail(user.email);
      if (profile.organization_type) setOrganizationType(profile.organization_type);
      if (profile.bio) setBio(profile.bio);
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
    }
  }, [profile, user]);

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
    if (!phone.trim()) {
      toast({ title: "Phone required", description: "Please enter your phone number", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email", variant: "destructive" });
      return;
    }
    if (!organizationType) {
      toast({ title: "Organization type required", description: "Please select an organization type", variant: "destructive" });
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

      await updateProfile(user.id, {
        country,
        bio,
        avatar_url,
        phone,
        email,
        organization_type: organizationType,
      });

      const freshProfile = await getProfile(user.id);
      await refreshProfile();

      toast({ title: "Profile complete! 🎉", description: "Welcome to Somopportunity" });

      const confirmedRole = freshProfile?.role || "seeker";
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
                  <Globe size={14} className="text-muted-foreground" /> Country <span className="text-destructive">*</span>
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

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Phone size={14} className="text-muted-foreground" /> Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+252 XX XXX XXXX"
                  type="tel"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Mail size={14} className="text-muted-foreground" /> Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>

              {/* Organization Type */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-muted-foreground" /> Organization Type <span className="text-destructive">*</span>
                </Label>
                <Select value={organizationType} onValueChange={setOrganizationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bio — Rich Text Editor */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <FileText size={14} className="text-muted-foreground" /> Short bio <span className="text-destructive">*</span>
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
