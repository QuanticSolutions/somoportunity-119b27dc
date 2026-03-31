import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Briefcase, Globe, ExternalLink, DollarSign, Eye, ShieldCheck, Tag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ApplicationForm from "@/components/ApplicationForm";
import SaveOpportunityButton from "@/components/SaveOpportunityButton";
import DeadlineCountdown from "@/components/DeadlineCountdown";
import { supabase } from "@/integrations/supabase/client";

const categoryColors: Record<string, string> = {
  job: "bg-primary/10 text-primary",
  internship: "bg-emerald-100 text-emerald-700",
  scholarship: "bg-amber-100 text-amber-700",
  fellowship: "bg-violet-100 text-violet-700",
  grant: "bg-rose-100 text-rose-700",
  event: "bg-sky-100 text-sky-700",
  workshop: "bg-orange-100 text-orange-700",
  conference: "bg-teal-100 text-teal-700",
};

export default function OpportunityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<any>(null);
  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchOpp = async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("*")
        .eq("id", id)
        .in("status", ["approved"])
        .single();
      setOpp(data);
      setLoading(false);

      if (data) {
        supabase.rpc("increment_opportunity_views", { opp_id: id });
        const { data: similarData } = await supabase
          .from("opportunities")
          .select("*")
          .in("status", ["approved"])
          .eq("category", data.category)
          .neq("id", id)
          .limit(3);
        setSimilar(similarData || []);
      }
    };
    fetchOpp();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <div className="container py-12 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SiteHeader />
        <div className="container flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Opportunity not found</h1>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/opportunities")}>
              <ArrowLeft size={16} className="mr-2" /> Browse Opportunities
            </Button>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const tags: string[] = opp.tags || [];
  const isDeadlineSoon = opp.deadline && (new Date(opp.deadline).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* Hero header */}
      <section className="hero-gradient py-12">
        <div className="container">
          <Button variant="ghost" className="mb-4 text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate("/opportunities")}>
            <ArrowLeft size={16} className="mr-1" /> Back to Opportunities
          </Button>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Badge className={categoryColors[opp.category] || "bg-muted text-muted-foreground"}>
                {opp.category}
              </Badge>
              <Badge className="bg-white/20 text-white capitalize">{opp.work_mode}</Badge>
              {opp.is_verified && (
                <Badge className="bg-emerald-500/20 text-emerald-200 gap-1">
                  <ShieldCheck size={12} /> Verified
                </Badge>
              )}
              {isDeadlineSoon && (
                <Badge className="bg-red-500/20 text-red-200 gap-1">
                  <Clock size={12} /> Urgent
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white md:text-4xl">{opp.title}</h1>
              <SaveOpportunityButton opportunityId={opp.id} className="text-white hover:text-white" />
            </div>
            {opp.company && <p className="mt-2 text-lg text-white/80">{opp.company}</p>}
            {opp.location && (
              <p className="mt-1 flex items-center gap-1.5 text-white/70 text-sm">
                <MapPin size={14} /> {opp.location}
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Two-column content */}
      <section className="container py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {opp.description && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground">Overview</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{opp.description}</div>
                </CardContent>
              </Card>
            )}
            {opp.requirements && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground">Requirements</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">{opp.requirements}</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sticky sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="glow-border">
              <CardContent className="p-6 space-y-4">
                {opp.external_link ? (
                  <Button className="btn-gradient w-full rounded-lg font-semibold text-base py-5" onClick={() => window.open(opp.external_link, "_blank")}>
                    Apply Now <ExternalLink size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button className="w-full rounded-lg font-semibold text-base py-5" disabled>
                    No Application Link
                  </Button>
                )}

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase size={16} className="text-primary shrink-0" />
                    <span className="capitalize">{opp.category}</span>
                  </div>
                  {opp.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin size={16} className="text-primary shrink-0" />
                      <span>{opp.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe size={16} className="text-primary shrink-0" />
                    <span className="capitalize">{opp.work_mode}</span>
                  </div>
                  {opp.deadline && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar size={16} className="text-primary shrink-0" />
                      <span>Deadline: {new Date(opp.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {opp.stipend_min != null && opp.stipend_max != null && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign size={16} className="text-primary shrink-0" />
                      <span>{opp.currency} {opp.stipend_min.toLocaleString()} – {opp.stipend_max.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye size={12} /> {opp.views_count ?? 0} views · Posted {new Date(opp.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Similar Opportunities */}
      {similar.length > 0 && (
        <section className="container pb-16">
          <h2 className="text-2xl font-extrabold text-foreground mb-6">Similar Opportunities</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <Card
                key={s.id}
                className="glow-border group cursor-pointer transition-shadow hover:shadow-[var(--card-shadow-hover)]"
                onClick={() => navigate(`/opportunities/${s.id}`)}
              >
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={categoryColors[s.category] || "bg-muted text-muted-foreground"}>
                      {s.category}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {s.company && <>{s.company} · </>}{s.location || "Remote"}
                  </p>
                  {s.deadline && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} /> {new Date(s.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <Button size="sm" variant="ghost" className="w-full text-primary font-semibold mt-2">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}