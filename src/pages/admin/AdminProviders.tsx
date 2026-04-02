import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Shield, Clock, CheckCircle2, Crown, Search, SlidersHorizontal,
  MoreHorizontal, Eye, Pencil, Ban, Trash2, FileDown, UserPlus,
  TrendingUp, AlertCircle, Building2,
} from "lucide-react";

interface ProviderRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  created_at: string;
  subscription: {
    status: string;
    plan_display_name: string;
  } | null;
  opportunity_count: number;
}

const PAGE_SIZE = 8;

export default function AdminProviders() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchProviders = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, country, created_at")
      .eq("role", "provider")
      .order("created_at", { ascending: false });

    const ids = (profiles || []).map((p) => p.id);

    const [{ data: subs }, { data: opps }] = await Promise.all([
      supabase
        .from("provider_subscriptions")
        .select("provider_id, status, subscription_plans(display_name)")
        .in("provider_id", ids.length ? ids : ["__none__"]),
      supabase
        .from("opportunities")
        .select("provider_id")
        .in("provider_id", ids.length ? ids : ["__none__"]),
    ]);

    const subsMap = new Map(
      (subs || []).map((s: any) => [
        s.provider_id,
        { status: s.status, plan_display_name: s.subscription_plans?.display_name || "Free" },
      ])
    );

    const oppCounts = new Map<string, number>();
    (opps || []).forEach((o: any) => {
      oppCounts.set(o.provider_id, (oppCounts.get(o.provider_id) || 0) + 1);
    });

    setProviders(
      (profiles || []).map((p) => ({
        ...p,
        subscription: subsMap.get(p.id) || null,
        opportunity_count: oppCounts.get(p.id) || 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchProviders();

    const channel = supabase
      .channel("admin-providers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProviders())
      .on("postgres_changes", { event: "*", schema: "public", table: "provider_subscriptions" }, () => fetchProviders())
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, () => fetchProviders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [providers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const totalCount = providers.length;
  const pendingCount = providers.filter((p) => p.subscription?.status === "pending_approval" || p.subscription?.status === "under_review").length;
  const activeCount = providers.filter((p) => p.subscription?.status === "active").length;
  const premiumCount = providers.filter((p) => {
    const plan = (p.subscription?.plan_display_name || "").toLowerCase();
    return plan.includes("pro") || plan.includes("enterprise") || plan.includes("premium");
  }).length;

  const initials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const statusBadge = (status: string | undefined) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Active</Badge>;
      case "pending_approval":
      case "under_review":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Pending Review</Badge>;
      case "rejected":
      case "suspended":
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Suspended</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">No Subscription</Badge>;
    }
  };

  const statCards = [
    {
      icon: Building2,
      label: "Total Providers",
      value: totalCount,
      badge: <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp size={12} />+4.2%</span>,
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Clock,
      label: "Pending Review",
      value: pendingCount,
      badge: pendingCount > 0 ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px] px-1.5 py-0">Action Required</Badge> : null,
      color: "bg-amber-100 text-amber-600",
    },
    {
      icon: CheckCircle2,
      label: "Verified Entities",
      value: activeCount,
      badge: totalCount > 0 ? <span className="text-xs text-emerald-600 font-medium">{Math.round((activeCount / totalCount) * 100)}%</span> : null,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      icon: Crown,
      label: "Premium Subscriptions",
      value: premiumCount,
      badge: <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-[10px] px-1.5 py-0">Tier 2+</Badge>,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Provider Oversight</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor ecosystem health, verify submission quality, and manage organizational subscription tiers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <FileDown size={14} /> Export Audit Log
          </Button>
          <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <UserPlus size={14} /> Register New Provider
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon size={20} />
                </div>
                {card.badge}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search by provider name, ID or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2 w-fit">
          <SlidersHorizontal size={14} /> Filters
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Provider Entity</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Plan Tier</TableHead>
                      <TableHead className="font-semibold text-center">Submissions</TableHead>
                      <TableHead className="font-semibold">Latest Activity</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          No providers found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginated.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={p.avatar_url || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {initials(p.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground text-sm">{p.full_name || "Unnamed"}</p>
                                <p className="text-xs text-muted-foreground">ID: {p.id.slice(0, 8).toUpperCase()}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(p.subscription?.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{p.subscription?.plan_display_name || "Free"}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                              {p.opportunity_count}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm text-foreground">Account Created</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(p.subscription?.status === "pending_approval" || p.subscription?.status === "under_review") && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                                  <AlertCircle size={12} /> Review
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="gap-2"><Eye size={14} /> View Provider</DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2"><Pencil size={14} /> Edit</DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 text-amber-600"><Ban size={14} /> Suspend</DropdownMenuItem>
                                  <DropdownMenuItem className="gap-2 text-destructive"><Trash2 size={14} /> Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border">
                {paginated.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No providers found.</div>
                ) : (
                  paginated.map((p) => (
                    <div key={p.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {initials(p.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{p.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">ID: {p.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2"><Eye size={14} /> View</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><Pencil size={14} /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-amber-600"><Ban size={14} /> Suspend</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive"><Trash2 size={14} /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {statusBadge(p.subscription?.status)}
                        <Badge variant="outline">{p.subscription?.plan_display_name || "Free"}</Badge>
                        <Badge variant="outline">{p.opportunity_count} submissions</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t px-4 py-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} providers
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <PaginationItem key={n}>
                          <PaginationLink
                            isActive={n === page}
                            onClick={() => setPage(n)}
                            className="cursor-pointer"
                          >
                            {n}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
