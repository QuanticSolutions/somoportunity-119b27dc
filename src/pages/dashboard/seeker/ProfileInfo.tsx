import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Upload, Globe, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadAvatar } from "@/services/profile";
import { toast } from "@/hooks/use-toast";
import RichTextEditor from "@/components/RichTextEditor";

const countries = [
  "Somalia", "Kenya", "Ethiopia", "Djibouti", "Uganda", "Tanzania",
  "Nigeria", "South Africa", "Egypt", "United States", "United Kingdom",
  "Canada", "Australia", "Germany", "France", "India", "Other",
];

export default function ProfileInfo() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCountry(profile.country || "");
      setBio(profile.bio || "");
      setAvatarPreview(profile.avatar_url || "");
    }
  }, [profile]);

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      let avatar_url = profile?.avatar_url || undefined;
      if (avatarFile) {
        avatar_url = await uploadAvatar(user.id, avatarFile);
      }
      await updateProfile(user.id, { full_name: fullName, country, bio, avatar_url });
      await refreshProfile();
      toast({ title: "Profile updated! ✨" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
        <User size={22} className="text-primary" /> Profile Info
      </h1>

      <Card className="glass-card border-border/50">
        <CardHeader><CardTitle>Your Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 border-2 border-primary/30">
                <AvatarImage src={avatarPreview} />
                <AvatarFallback className="bg-accent text-accent-foreground text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <Label htmlFor="avatar-upload" className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Upload size={14} /> Change photo
              </Label>
              <Input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Globe size={14} className="text-muted-foreground" /> Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><FileText size={14} className="text-muted-foreground" /> Bio</Label>
              <RichTextEditor
                value={bio}
                onChange={setBio}
                placeholder="Write a short professional bio..."
                maxLength={500}
              />
            </div>

            <Button type="submit" disabled={loading} className="btn-gradient w-full rounded-lg font-semibold">
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
