import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, User, CreditCard, Phone, Check, Clock, Globe, Linkedin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, uploadAvatar } from "@/services/profile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProviderSettings() {
  const { user, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("company");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);

  // Contact fields
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  // Subscription
  const [sub, setSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setCountry(profile.country || "");
      setCity((profile as any).city || "");
      setOrgName((profile as any).organization_name || "");
      setOrgType((profile as any).organization_type || "company");
      setWebsite((profile as any).website || "");
      setLinkedin((profile as any).linkedin || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || user?.email || "");
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
    }
  }, [profile, user]);

  useEffect(() => {
    if (!user) return;
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    const [{ data: subData }, { data: planData }] = await Promise.all([
      supabase.from("provider_subscriptions").select("*, subscription_plans(*)").eq("provider_id", user!.id).single(),
      supabase.from("subscription_plans").select("*"),
    ]);
    setSub(subData);
    setPlans(planData || []);
    setSubLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url || undefined;
      if (avatarFile) avatar_url = await uploadAvatar(user.id, avatarFile);
      await updateProfile(user.id, {
        full_name: fullName,
        bio,
        country,
        avatar_url,
        city,
        organization_name: orgName,
        organization_type: orgType,
        website,
        linkedin,
      });
      await refreshProfile();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContact = async () => {
    if (!user) return;
    if (!email.trim()) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: "Phone number is required", variant: "destructive" });
      return;
    }
    setSavingContact(true);
    try {
      await updateProfile(user.id, { email, phone });
      await refreshProfile();
      toast({ title: "Contact info saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingContact(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "active") return "bg-emerald-100 text-emerald-700";
    if (status === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-amber-100 text-amber-700";
  };

  const initials = fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-foreground">Settings</h1>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User size={14} /> Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard size={14} /> Subscription
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Phone size={14} /> Contact
          </TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your organization and personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/30">
                  <AvatarImage src={avatarPreview} />
                  <AvatarFallback className="bg-accent text-accent-foreground font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="settings-avatar" className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Upload size={14} /> Change photo
                  </Label>
                  <Input id="settings-avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Organization Name</Label>
                  <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Your organization" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Organization Type</Label>
                  <Select value={orgType} onValueChange={setOrgType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="government">Government</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Globe size={14} /> Website</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Linkedin size={14} /> LinkedIn</Label>
                <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/company/..." />
              </div>

              <div className="space-y-1.5">
                <Label>Bio / Description</Label>
                <Textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about your organization..." />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="btn-gradient rounded-lg font-semibold">
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTION TAB */}
        <TabsContent value="subscription">
          <div className="space-y-6">
            {subLoading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : sub ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard size={20} className="text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{(sub.subscription_plans as any)?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${(sub.subscription_plans as any)?.price}/month
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColor(sub.status)}>{sub.status.replace(/_/g, " ")}</Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} />
                        <span>Started: {new Date(sub.created_at).toLocaleDateString()}</span>
                      </div>
                      {sub.renewal_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock size={14} />
                          <span>Renews: {new Date(sub.renewal_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Change Plan</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your new plan will be activated at the end of your current billing cycle.
                  </p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {plans.map(plan => {
                      const isCurrent = sub.plan_id === plan.id;
                      const features = (plan.features || []) as string[];
                      return (
                        <Card key={plan.id} className={`flex flex-col ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                          {isCurrent && (
                            <div className="text-center pt-3">
                              <Badge className="bg-primary text-primary-foreground text-xs">Current</Badge>
                            </div>
                          )}
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{plan.name}</CardTitle>
                            <p className="text-xl font-bold text-foreground">${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col">
                            <ul className="flex-1 space-y-1.5 mb-4">
                              {features.map((f, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <Check size={12} className="mt-0.5 shrink-0 text-primary" />
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                            <Button
                              size="sm"
                              variant={isCurrent ? "outline" : "default"}
                              disabled={isCurrent}
                              className={isCurrent ? "" : "btn-gradient font-semibold"}
                              onClick={async () => {
                                await supabase.from("provider_subscriptions").update({
                                  plan_id: plan.id,
                                  status: "pending_payment",
                                  payment_status: "awaiting_payment",
                                }).eq("id", sub.id);
                                toast({ title: "Plan change requested", description: "Your new plan will be activated at the end of your current billing cycle." });
                                fetchSubscription();
                              }}
                            >
                              {isCurrent ? "Current" : "Switch"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No active subscription. Please select a plan.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* CONTACT TAB */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Update your email and phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                  />
                  <p className="text-xs text-muted-foreground">This is your contact email displayed to applicants.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number <span className="text-destructive">*</span></Label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+252 XX XXX XXXX"
                    type="tel"
                  />
                </div>
              </div>
              <Button onClick={handleSaveContact} disabled={savingContact} className="btn-gradient rounded-lg font-semibold">
                {savingContact ? "Saving…" : "Save Contact Info"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
