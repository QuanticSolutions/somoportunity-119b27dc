import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { getStripePriceForPlan } from "@/lib/feature-gating";
import { logActivity } from "@/lib/activity-logger";

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  pending_approval: { label: "Pending Approval", className: "bg-amber-100 text-amber-700" },
  under_review: { label: "Under Review", className: "bg-amber-100 text-amber-700" },
  pending_payment: { label: "Pending Payment", className: "bg-amber-100 text-amber-700" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  inactive: { label: "Inactive", className: "bg-destructive/10 text-destructive" },
  expired: { label: "Expired", className: "bg-destructive/10 text-destructive" },
  past_due: { label: "Past Due", className: "bg-destructive/10 text-destructive" },
};

export default function Subscription() {
  const { user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();

    // Check for checkout success/cancel in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast({ title: "Payment successful!", description: "Your subscription is being activated." });
      refreshSubscription();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("checkout") === "cancel") {
      toast({ title: "Checkout cancelled", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
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

  const refreshSubscription = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      if (data?.subscribed) {
        toast({ title: "Subscription active!", description: "Your plan has been updated." });
      }
      await fetchData();
    } catch (err: any) {
      console.error("Error checking subscription:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCheckout = async (plan: any) => {
    if (!user) return;
    const stripePriceId = plan.stripe_price_id || getStripePriceForPlan(plan.name);
    if (!stripePriceId) {
      toast({ title: "Error", description: "No Stripe price configured for this plan.", variant: "destructive" });
      return;
    }

    setCheckingOut(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: stripePriceId, planId: plan.id },
      });
      if (error) throw error;
      if (data?.url) {
        await logActivity("subscription_checkout_started", "subscription", plan.id, { plan_name: plan.name });
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCheckingOut(null);
    }
  };

  const handleManage = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-foreground">Subscription</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshSubscription} disabled={refreshing}>
            <RefreshCw size={16} className={`mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
          {sub?.stripe_subscription_id && (
            <Button variant="outline" size="sm" onClick={handleManage}>
              <ExternalLink size={16} className="mr-1" />
              Manage Billing
            </Button>
          )}
        </div>
      </div>

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
              {sub.current_period_end && (
                <p className="text-xs text-muted-foreground">Renews {new Date(sub.current_period_end).toLocaleDateString()}</p>
              )}
              {!sub.current_period_end && sub.renewal_date && (
                <p className="text-xs text-muted-foreground">Renews {new Date(sub.renewal_date).toLocaleDateString()}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const isCurrentPlan = sub && sub.plan_id === plan.id && sub.status === "active";
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
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                      <span>{plan.posting_limit ? `Up to ${plan.posting_limit} postings` : "Unlimited postings"}</span>
                    </li>
                  </ul>
                  <Button
                    className={isCurrentPlan ? "" : "btn-gradient w-full rounded-lg font-semibold"}
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan || checkingOut === plan.id}
                    onClick={() => handleCheckout(plan)}
                  >
                    {checkingOut === plan.id ? "Opening checkout…" : isCurrentPlan ? "Current Plan" : sub?.status === "active" ? "Change Plan" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

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
