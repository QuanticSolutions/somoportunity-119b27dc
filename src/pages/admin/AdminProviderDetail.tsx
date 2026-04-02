import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, Building2, Globe, Phone, Mail, MapPin, Linkedin, Calendar, CreditCard, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProviderProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  organization_name: string | null;
  organization_type: string | null;
  website: string | null;
  linkedin: string | null;
  created_at: string;
}

interface SubscriptionInfo {
  status: string;
  payment_status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  receipt_url: string | null;
  plan: { display_name: string; price_monthly: number } | null;
}

export default function AdminProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: prof }, { data: sub }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase
          .from("provider_subscriptions")
          .select("status, payment_status, current_period_start, current_period_end, receipt_url, subscription_plans(display_name, price_monthly)")
          .eq("provider_id", id)
          .maybeSingle(),
      ]);

      setProfile(prof as any);
      if (sub) {
        setSubscription({
          status: sub.status,
          payment_status: sub.payment_status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          receipt_url: sub.receipt_url,
          plan: (sub as any).subscription_plans || null,
        });
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  const initials = (name: string | null) => name ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "pending_approval" || s === "under_review") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Provider not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/providers")}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/providers")}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Provider Details</h1>
          <p className="text-sm text-muted-foreground">Full provider profile and subscription information</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <h2 className="text-xl font-bold text-foreground">{profile.full_name || "Unnamed Provider"}</h2>
              {profile.organization_name && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Building2 size={14} /> {profile.organization_name}</p>
              )}
              {profile.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><User size={16} /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow icon={<User size={14} />} label="Full Name" value={profile.full_name} />
            <DetailRow icon={<Phone size={14} />} label="Phone" value={profile.phone} />
            <DetailRow icon={<MapPin size={14} />} label="Country" value={profile.country} />
            <DetailRow icon={<MapPin size={14} />} label="City" value={profile.city} />
            <DetailRow icon={<Calendar size={14} />} label="Joined" value={new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 size={16} /> Organization Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow icon={<Building2 size={14} />} label="Organization" value={profile.organization_name} />
            <DetailRow icon={<Building2 size={14} />} label="Type" value={profile.organization_type} />
            <DetailRow icon={<Globe size={14} />} label="Website" value={profile.website} isLink />
            <DetailRow icon={<Linkedin size={14} />} label="LinkedIn" value={profile.linkedin} isLink />
          </CardContent>
        </Card>
      </div>

      {/* Subscription Info */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard size={16} /> Subscription Information</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current Plan</p>
                <p className="text-sm font-semibold">{subscription.plan?.display_name || "Unknown"}</p>
                {subscription.plan && <p className="text-xs text-muted-foreground">${subscription.plan.price_monthly}/mo</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge className={statusColor(subscription.status)}>{subscription.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <Badge variant="outline">{subscription.payment_status.replace(/_/g, " ")}</Badge>
              </div>
              {subscription.current_period_start && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm">{new Date(subscription.current_period_start).toLocaleDateString()}</p>
                </div>
              )}
              {subscription.current_period_end && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="text-sm">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
                </div>
              )}
              {subscription.receipt_url && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Receipt</p>
                  <a href={subscription.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                    <FileText size={14} /> View Receipt
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No subscription found for this provider.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ icon, label, value, isLink }: { icon: React.ReactNode; label: string; value: string | null; isLink?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {value ? (
          isLink ? (
            <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
              {value}
            </a>
          ) : (
            <p className="text-sm text-foreground">{value}</p>
          )
        ) : (
          <p className="text-sm text-muted-foreground italic">Not provided</p>
        )}
      </div>
    </div>
  );
}
