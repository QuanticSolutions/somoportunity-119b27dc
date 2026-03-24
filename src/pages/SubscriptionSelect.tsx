import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionSelect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    // Check if already subscribed
    const check = async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from("provider_subscriptions")
        .select("id, status")
        .eq("provider_id", user.id)
        .single();

      if (existing) {
        if (existing.status === "active") {
          navigate("/dashboard/provider", { replace: true });
        } else if (existing.status === "pending") {
          navigate("/provider/payment", { replace: true });
        } else {
          navigate("/provider/pending", { replace: true });
        }
        return;
      }

      const { data } = await supabase.from("subscription_plans").select("*");
      setPlans(data || []);
      setLoading(false);
    };
    check();
  }, [user]);

  const selectPlan = async (planId: string) => {
    if (!user) return;
    setSelecting(planId);
    try {
      const { data: subData, error } = await supabase.from("provider_subscriptions").insert({
        provider_id: user.id,
        plan_id: planId,
        status: "pending",
      }).select().single();

      if (error) throw error;

      // Create admin notification
      await supabase.from("admin_notifications").insert({
        provider_id: user.id,
        type: "subscription_request",
        message: "New provider subscription request received.",
      });

      // Create audit log
      if (subData) {
        await supabase.from("subscription_audit_logs").insert({
          subscription_id: subData.id,
          action: "provider_requested_plan",
          notes: `Provider selected a subscription plan.`,
        });
      }

      toast({
        title: "Plan selected",
        description: "Your plan request has been received. Our team will contact you shortly with payment instructions.",
      });
      navigate("/provider/payment", { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl w-full px-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow opacity-40" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <Sparkles size={24} className="text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Choose Your Plan</h1>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          Select a subscription plan to start posting opportunities. Your account will be reviewed by an admin.
        </p>
      </motion.div>

      <div className="relative z-10 grid gap-6 md:grid-cols-3 max-w-5xl w-full">
        {plans.map((plan, i) => {
          const features = (plan.features || []) as string[];
          const isPopular = plan.tier === 2;
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`relative h-full flex flex-col ${isPopular ? "ring-2 ring-primary shadow-lg" : "glow-border"}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="btn-gradient rounded-full px-4 py-1 text-xs font-semibold">Most Popular</span>
                  </div>
                )}
                <CardHeader className="pt-8">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="flex-1 space-y-2.5 mb-8">
                    {features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="btn-gradient w-full rounded-lg font-semibold"
                    onClick={() => selectPlan(plan.id)}
                    disabled={selecting === plan.id}
                  >
                    {selecting === plan.id ? "Selecting…" : "Select Plan"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
