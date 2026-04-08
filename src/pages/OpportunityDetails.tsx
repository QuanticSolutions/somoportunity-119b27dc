import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, MapPin, Calendar, Briefcase, Globe, ExternalLink,
  DollarSign, Eye, ShieldCheck, Tag, Clock, CheckCircle2,
  ListOrdered, Gift, FileText, Printer, Bookmark, Copy,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ApplicationForm from "@/components/ApplicationForm";
import SaveOpportunityButton from "@/components/SaveOpportunityButton";
import DeadlineCountdown from "@/components/DeadlineCountdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";

const categoryColors: Record<string, string> = {
  job: "bg-primary/10 text-primary",
  internship: "bg-emerald-100 text-emerald-700",
  scholarship: "bg-amber-100 text-amber-700",
  fellowship: "bg-violet-100 text-violet-700",
  grant: "bg-rose-100 text-rose-700",
  event: "bg-sky-100 text-sky-700",
  workshop: "bg-orange-100 text-orange-700",
  conference: "bg-teal-100 text-teal-700",
  competition: "bg-indigo-100 text-indigo-700",
  volunteer: "bg-pink-100 text-pink-700",
};

// Categories that redirect to external link instead of internal apply
const externalCategories = ["scholarship", "grant", "internship", "fellowship", "conference"];

function SafeHTML({ html }: { html: string }) {
  return (
    <div
      className="prose prose-sm max-w-none text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

export default function OpportunityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
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

        // Fetch provider info
        if (data.provider_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name, organization_name, avatar_url")
            .eq("id", data.provider_id)
            .single();
          setProvider(prof);
        }

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied to clipboard!" });
  };

  const handlePrint = () => window.print();

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(opp?.title || "");
    const links: Record<string, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
    };
    if (links[platform]) window.open(links[platform], "_blank");
  };

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
  const eligibility: string[] = opp.eligibility || [];
  const applicationSteps: { title: string; description?: string }[] = opp.application_steps || [];
  const isDeadlineSoon = opp.deadline && (new Date(opp.deadline).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
  const isExpired = opp.deadline && new Date(opp.deadline).getTime() < Date.now();
  const isExternalCategory = externalCategories.includes(opp.category);

  const daysExpiredAgo = isExpired
    ? Math.floor((Date.now() - new Date(opp.deadline).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const deadlineDate = opp.deadline ? new Date(opp.deadline) : null;
  const formattedDeadline = deadlineDate
    ? deadlineDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="hero-gradient py-12">
        <div className="container">
          <Button variant="ghost" className="mb-4 text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate("/opportunities")}>
            <ArrowLeft size={16} className="mr-1" /> Back to Opportunities
          </Button>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Badge className={categoryColors[opp.category] || "bg-muted text-muted-foreground"}>{opp.category}</Badge>
              <Badge className="bg-white/20 text-white capitalize">{opp.work_mode}</Badge>
              {opp.is_verified && (
                <Badge className="bg-emerald-500/20 text-emerald-200 gap-1"><ShieldCheck size={12} /> Verified</Badge>
              )}
              {isDeadlineSoon && !isExpired && (
                <Badge className="bg-red-500/20 text-red-200 gap-1"><Clock size={12} /> Urgent</Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white md:text-4xl">{opp.title}</h1>
              <SaveOpportunityButton opportunityId={opp.id} className="text-white hover:text-white" />
            </div>
            {opp.company && <p className="mt-2 text-lg text-white/80">{opp.company}</p>}
            {opp.location && (
              <p className="mt-1 flex items-center gap-1.5 text-white/70 text-sm"><MapPin size={14} /> {opp.location}</p>
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

      {/* Content */}
      <section className="container py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {opp.description && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground flex items-center gap-2">
                    <FileText size={18} className="text-primary" /> Overview
                  </h2>
                  <SafeHTML html={opp.description} />
                </CardContent>
              </Card>
            )}

            {opp.requirements && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground flex items-center gap-2">
                    <FileText size={18} className="text-primary" /> Requirements
                  </h2>
                  <SafeHTML html={opp.requirements} />
                </CardContent>
              </Card>
            )}

            {eligibility.length > 0 && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-primary" /> Eligibility Criteria
                  </h2>
                  <ul className="space-y-2">
                    {eligibility.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {opp.benefits && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground flex items-center gap-2">
                    <Gift size={18} className="text-primary" /> Benefits
                  </h2>
                  <SafeHTML html={opp.benefits} />
                </CardContent>
              </Card>
            )}

            {applicationSteps.length > 0 && (
              <Card className="glass-card">
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-bold text-foreground flex items-center gap-2">
                    <ListOrdered size={18} className="text-primary" /> Application Process
                  </h2>
                  <ol className="space-y-4">
                    {applicationSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{step.title}</p>
                          {step.description && <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}

            {/* Apply Section - Big buttons */}
            <Card className="glass-card">
              <CardContent className="p-6">
                <h2 className="mb-4 text-lg font-bold text-foreground">Apply for this Opportunity</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {isExternalCategory && opp.external_link ? (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-lg py-6"
                      onClick={() => window.open(opp.external_link, "_blank")}
                    >
                      APPLY NOW
                    </Button>
                  ) : opp.allow_internal_apply ? null : (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-lg py-6"
                      onClick={() => opp.external_link ? window.open(opp.external_link, "_blank") : null}
                      disabled={!opp.external_link}
                    >
                      APPLY NOW
                    </Button>
                  )}
                  {opp.official_website && (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-lg py-6"
                      onClick={() => window.open(opp.official_website, "_blank")}
                    >
                      OFFICIAL LINK
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Internal application form - only for non-external categories */}
            {opp.allow_internal_apply && !isExternalCategory && (
              <ApplicationForm opportunityId={opp.id} opportunityTitle={opp.title} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="shadow-md border-border/60">
              <CardContent className="p-6 space-y-5">
                {/* Key Details */}
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">Key Details</h3>
                  {deadlineDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-primary shrink-0" />
                      <div>
                        <span className="text-primary font-medium">Deadline</span>
                        <p className="text-muted-foreground">
                          {deadlineDate.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Print & Save */}
                <div className="flex items-center justify-center gap-8">
                  <button onClick={handlePrint} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                    <Printer size={20} />
                    <span className="text-xs">Print</span>
                  </button>
                  <div className="flex flex-col items-center gap-1">
                    <SaveOpportunityButton opportunityId={opp.id} />
                    <span className="text-xs text-muted-foreground">Save</span>
                  </div>
                </div>

                <Separator />

                {/* Share */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Share</h4>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleShare("linkedin")} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="LinkedIn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </button>
                    <button onClick={() => handleShare("facebook")} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Facebook">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </button>
                    <button onClick={() => handleShare("whatsapp")} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="WhatsApp">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </button>
                    <button onClick={handleCopyLink} className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Copy link">
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Application Deadline Status */}
                {deadlineDate && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={16} className="shrink-0" />
                      <span>Application Deadline</span>
                    </div>
                    {isExpired ? (
                      <p className="text-sm font-semibold text-destructive ml-6">
                        Expired {daysExpiredAgo} days ago
                      </p>
                    ) : (
                      <DeadlineCountdown deadline={opp.deadline} />
                    )}
                    <p className="text-xs text-muted-foreground ml-6">{formattedDeadline}</p>
                  </div>
                )}

                <Separator />

                {/* Type */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Briefcase size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-semibold text-foreground capitalize">{opp.category}</p>
                    </div>
                  </div>

                  {/* Categories / Tags */}
                  {tags.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Tag size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Categories</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs uppercase">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Posted by */}
                  <div className="flex items-start gap-2 text-sm">
                    <User size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Posted by</p>
                      <p className="font-semibold text-foreground">
                        {provider?.organization_name || provider?.full_name || opp.company || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  {opp.location && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-semibold text-foreground">{opp.location}</p>
                      </div>
                    </div>
                  )}

                  {/* Work Mode */}
                  <div className="flex items-start gap-2 text-sm">
                    <Globe size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Work Mode</p>
                      <p className="font-semibold text-foreground capitalize">{opp.work_mode}</p>
                    </div>
                  </div>

                  {/* Stipend */}
                  {opp.stipend_min != null && opp.stipend_max != null && (
                    <div className="flex items-start gap-2 text-sm">
                      <DollarSign size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Stipend</p>
                        <p className="font-semibold text-foreground">{opp.currency} {opp.stipend_min.toLocaleString()} – {opp.stipend_max.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* Compensation */}
                  {opp.compensation && (
                    <div className="flex items-start gap-2 text-sm">
                      <DollarSign size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Compensation</p>
                        <p className="font-semibold text-foreground">{opp.compensation}</p>
                      </div>
                    </div>
                  )}

                  {/* Funding */}
                  {opp.funding_amount && (
                    <div className="flex items-start gap-2 text-sm">
                      <DollarSign size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-muted-foreground">Funding</p>
                        <p className="font-semibold text-foreground">{opp.funding_amount}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="pt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye size={12} /> {opp.views_count ?? 0} views · Posted {new Date(opp.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Similar */}
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
                  <Badge className={categoryColors[s.category] || "bg-muted text-muted-foreground"}>{s.category}</Badge>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {s.company && <>{s.company} · </>}{s.location || "Remote"}
                  </p>
                  {s.deadline && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} /> {new Date(s.deadline).toLocaleDateString()}
                    </p>
                  )}
                  <Button size="sm" variant="ghost" className="w-full text-primary font-semibold mt-2">View Details</Button>
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
