import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-700" },
  pending_payment: { label: "Pending Payment", className: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  inactive: { label: "Inactive", className: "bg-destructive/10 text-destructive" },
  expired: { label: "Expired", className: "bg-destructive/10 text-destructive" },
};

export default function Subscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [{ data: subData }, { data: planData }] = await Promise.all([
      supabase.from("provider_subscriptions").select("*, subscription_plans(*)").eq("provider_id", user!.id).single(),
      supabase.from("subscription_plans").select("*").order("tier"),
    ]);
    setSub(subData);
    setPlans(planData || []);
    setLoading(false);
  };

  const selectPlan = async (planId: string) => {
    if (!user) return;
    setChangingPlan(planId);
    try {
      let subscriptionId = sub?.id;
      const selectedPlan = plans.find(p => p.id === planId);

      if (sub) {
        const { error } = await supabase.from("provider_subscriptions").update({
          plan_id: planId,
          status: "under_review",
          payment_status: "awaiting_payment",
        }).eq("id", sub.id);
        if (error) throw error;
      } else {
        const { data: newSub, error } = await supabase.from("provider_subscriptions").insert({
          provider_id: user.id,
          plan_id: planId,
          status: "pending_payment",
          payment_status: "awaiting_payment",
        }).select().single();
        if (error) throw error;
        subscriptionId = newSub?.id;
      }

      // Create admin notification
      await supabase.from("admin_notifications").insert({
        provider_id: user.id,
        type: "subscription_request",
        message: sub
          ? `Provider requested plan change to ${selectedPlan?.display_name || "a new plan"}.`
          : "New provider subscription request received.",
      });

      // Create audit log
      if (subscriptionId) {
        await supabase.from("subscription_audit_logs").insert({
          subscription_id: subscriptionId,
          action: sub ? "provider_requested_plan_change" : "provider_requested_plan",
          notes: sub
            ? `Provider requested to change from ${(sub.subscription_plans as any)?.display_name} to ${selectedPlan?.display_name}.`
            : `Provider selected ${selectedPlan?.display_name}.`,
        });
      }

      toast({
        title: sub ? "Plan change requested" : "Plan selected",
        description: "Your request has been submitted for admin approval. You'll be notified once reviewed.",
      });
      await fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setChangingPlan(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status.replace(/_/g, " "), className: "bg-destructive/10 text-destructive" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-48" /><div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div></div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold text-foreground">Subscription</h1>

      {sub && (
        <Card className="glow-border">
          <CardContent className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <CreditCard size={24} className="text-primary" />
              <div>
                <p className="font-semibold text-foreground">{(sub.subscription_plans as any)?.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  Posting limit: {(sub.subscription_plans as any)?.posting_limit ?? "Unlimited"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(sub.status)}
              {sub.renewal_date && (
                <p className="text-xs text-muted-foreground">Renews {new Date(sub.renewal_date).toLocaleDateString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const isCurrentPlan = sub && sub.plan_id === plan.id;
          const features = (plan.features || []) as string[];
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`relative h-full flex flex-col ${isCurrentPlan ? "ring-2 ring-primary" : "glow-border"}`}>
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold text-foreground">${plan.price_monthly}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="flex-1 space-y-2 mb-6">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={isCurrentPlan ? "" : "btn-gradient w-full rounded-lg font-semibold"}
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan || changingPlan === plan.id}
                    onClick={() => selectPlan(plan.id)}
                  >
                    {changingPlan === plan.id ? "Processing…" : isCurrentPlan ? "Current Plan" : sub ? "Change Plan" : "Select Plan"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Promotional Add-ons</CardTitle>
          <CardDescription>Boost your opportunity visibility</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {[
            { name: "Social Media Promotion", price: 20, desc: "Feature on our social channels" },
            { name: "Newsletter Feature", price: 40, desc: "Highlighted in our weekly newsletter" },
            { name: "Priority Placement", price: 35, desc: "Top placement in search results" },
          ].map(addon => (
            <Card key={addon.name} className="glow-border">
              <CardContent className="py-4 text-center">
                <p className="font-semibold text-foreground">{addon.name}</p>
                <p className="text-2xl font-bold text-primary mt-1">+${addon.price}</p>
                <p className="text-xs text-muted-foreground mt-1">{addon.desc}</p>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
