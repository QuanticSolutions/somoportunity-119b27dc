import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  opportunityId: string;
  size?: "sm" | "default" | "icon";
  className?: string;
}

export default function SaveOpportunityButton({ opportunityId, size = "icon", className }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_jobs")
      .select("id")
      .eq("user_id", user.id)
      .eq("opportunity_id", opportunityId)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, opportunityId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in to save opportunities", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (saved) {
        await supabase.from("saved_jobs").delete().eq("user_id", user.id).eq("opportunity_id", opportunityId);
        setSaved(false);
        toast({ title: "Removed from saved" });
      } else {
        await supabase.from("saved_jobs").insert({ user_id: user.id, opportunity_id: opportunityId });
        setSaved(true);
        toast({ title: "Saved!" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={toggle}
      disabled={loading}
      className={cn("shrink-0", className)}
      title={saved ? "Unsave" : "Save"}
    >
      <Bookmark size={18} className={cn(saved ? "fill-primary text-primary" : "text-muted-foreground")} />
    </Button>
  );
}
