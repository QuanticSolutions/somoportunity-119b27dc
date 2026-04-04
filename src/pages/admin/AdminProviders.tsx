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
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield, Clock, CheckCircle2, Crown, Search, SlidersHorizontal,
  MoreHorizontal, Eye, Pencil, Ban, Trash2, FileDown, UserPlus,
  TrendingUp, AlertCircle, Building2, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProviderRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  country: string | null;
  organization_name: string | null;
  organization_type: string | null;
  phone: string | null;
  bio: string | null;
  created_at: string;
  subscription: {
    status: string;
    plan_display_name: string;
  } | null;
  opportunity_count: number;
}

const PAGE_SIZE = 8;

export default function AdminProviders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal states
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ProviderRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "delete"; provider: ProviderRow } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Register form
  const [regForm, setRegForm] = useState({ full_name: "", organization_name: "", email: "", phone: "", country: "", organization_type: "company", password: "" });
  // Edit form
  const [editForm, setEditForm] = useState({ full_name: "", organization_name: "", phone: "", country: "", organization_type: "", bio: "" });

  const fetchProviders = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "provider")
      .order("created_at", { ascending: false });

    console.log(profiles)  
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
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Register Provider ---
  const handleRegister = async () => {
    if (!regForm.email || !regForm.phone || !regForm.password) {
      toast({ title: "Validation Error", description: "Email, phone, and password are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-create-user", {
        body: { email: regForm.email, password: regForm.password, role: "provider", full_name: regForm.full_name },
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Failed to create user");
      }

      // Update profile with additional fields
      const userId = res.data?.user?.id;
      if (userId) {
        await supabase.from("profiles").update({
          organization_name: regForm.organization_name,
          organization_type: regForm.organization_type,
          phone: regForm.phone,
          country: regForm.country,
        }).eq("id", userId);
      }

      toast({ title: "Provider registered successfully" });
      setRegisterOpen(false);
      setRegForm({ full_name: "", organization_name: "", email: "", phone: "", country: "", organization_type: "company", password: "" });
      fetchProviders();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Edit Provider ---
  const openEdit = (p: ProviderRow) => {
    setEditProvider(p);
    setEditForm({
      full_name: p.full_name || "",
      organization_name: p.organization_name || "",
      phone: p.phone || "",
      country: p.country || "",
      organization_type: p.organization_type || "",
      bio: p.bio || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editProvider) return;
    if (!editForm.phone) {
      toast({ title: "Validation Error", description: "Phone number is required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name,
      organization_name: editForm.organization_name,
      phone: editForm.phone,
      country: editForm.country,
      organization_type: editForm.organization_type,
      bio: editForm.bio,
    }).eq("id", editProvider.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Provider updated successfully" });
      setEditOpen(false);
      fetchProviders();
    }
    setSubmitting(false);
  };

  // --- Suspend / Delete ---
  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setSubmitting(true);
    const { provider, type } = confirmAction;

    // Log the action
    const adminUser = (await supabase.auth.getUser()).data.user;

    if (type === "suspend") {
      // Update subscription status to suspended if exists
      await supabase.from("provider_subscriptions").update({ status: "suspended" }).eq("provider_id", provider.id);
      await supabase.from("admin_logs").insert({
        admin_id: adminUser?.id,
        action: "Provider suspended",
        target_id: provider.id,
        target_type: "provider",
      });
      toast({ title: "Provider suspended" });
    } else {
      // Soft delete: change role to prevent access
      await supabase.from("provider_subscriptions").update({ status: "cancelled" }).eq("provider_id", provider.id);
      await supabase.from("admin_logs").insert({
        admin_id: adminUser?.id,
        action: "Provider deleted",
        target_id: provider.id,
        target_type: "provider",
      });
      toast({ title: "Provider removed" });
    }

    setConfirmAction(null);
    setSubmitting(false);
    fetchProviders();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.organization_name || "").toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [providers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCount = providers.length;
  const pendingCount = providers.filter((p) => p.subscription?.status === "pending" || p.subscription?.status === "pending_approval").length;
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
      case "pending":
      case "pending_approval":
      case "under_review":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Pending</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">Suspended</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100">Deleted</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">No Subscription</Badge>;
    }
  };

  const statCards = [
    { icon: Building2, label: "Total Providers", value: totalCount, badge: <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><TrendingUp size={12} />Active</span>, color: "bg-primary/10 text-primary" },
    { icon: Clock, label: "Pending Review", value: pendingCount, badge: pendingCount > 0 ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px] px-1.5 py-0">Action Required</Badge> : null, color: "bg-amber-100 text-amber-600" },
    { icon: CheckCircle2, label: "Verified Entities", value: activeCount, badge: totalCount > 0 ? <span className="text-xs text-emerald-600 font-medium">{Math.round((activeCount / totalCount) * 100)}%</span> : null, color: "bg-emerald-100 text-emerald-600" },
    { icon: Crown, label: "Premium Subscriptions", value: premiumCount, badge: <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-[10px] px-1.5 py-0">Tier 2+</Badge>, color: "bg-purple-100 text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Provider Oversight</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor ecosystem health, verify submission quality, and manage organizational subscription tiers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><FileDown size={14} /> Export Audit Log</Button>
          <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setRegisterOpen(true)}>
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
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}><card.icon size={20} /></div>
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

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Search by provider name or organization..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="font-semibold">Provider Entity</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Plan Tier</TableHead>
                      <TableHead className="font-semibold text-center">Submissions</TableHead>
                      <TableHead className="font-semibold">Joined</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No providers found.</TableCell></TableRow>
                    ) : (
                      paginated.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={p.avatar_url || ""} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(p.full_name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-foreground text-sm">{p.full_name || "Unnamed"}</p>
                                <p className="text-xs text-muted-foreground">{p.organization_name || `ID: ${p.id.slice(0, 8).toUpperCase()}`}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(p.subscription?.status)}</TableCell>
                          <TableCell><span className="text-sm font-medium">{p.subscription?.plan_display_name || "Free"}</span></TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">{p.opportunity_count}</span>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onClick={() => navigate(`/admin/providers/${p.id}`)}><Eye size={14} /> View</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2" onClick={() => openEdit(p)}><Pencil size={14} /> Edit</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => setConfirmAction({ type: "suspend", provider: p })}><Ban size={14} /> Suspend</DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setConfirmAction({ type: "delete", provider: p })}><Trash2 size={14} /> Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(p.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{p.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground">{p.organization_name || `ID: ${p.id.slice(0, 8)}`}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={16} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => navigate(`/admin/providers/${p.id}`)}><Eye size={14} /> View</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => openEdit(p)}><Pencil size={14} /> Edit</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => setConfirmAction({ type: "suspend", provider: p })}><Ban size={14} /> Suspend</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setConfirmAction({ type: "delete", provider: p })}><Trash2 size={14} /> Delete</DropdownMenuItem>
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
                  <p className="text-xs text-muted-foreground">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <PaginationItem key={n}>
                          <PaginationLink isActive={n === page} onClick={() => setPage(n)} className="cursor-pointer">{n}</PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Register Provider Modal */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Provider</DialogTitle>
            <DialogDescription>Create a new provider account manually.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={regForm.full_name} onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Organization Name</Label>
                <Input value={regForm.organization_name} onChange={(e) => setRegForm({ ...regForm, organization_name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone Number *</Label>
                <Input value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={regForm.country} onChange={(e) => setRegForm({ ...regForm, country: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Organization Type</Label>
              <Select value={regForm.organization_type} onValueChange={(v) => setRegForm({ ...regForm, organization_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="ngo">NGO</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button onClick={handleRegister} disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Provider Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>Update provider information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Organization Name</Label>
                <Input value={editForm.organization_name} onChange={(e) => setEditForm({ ...editForm, organization_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone Number *</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Organization Type</Label>
              <Select value={editForm.organization_type} onValueChange={(v) => setEditForm({ ...editForm, organization_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="ngo">NGO</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting} className="bg-primary text-primary-foreground">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Suspend/Delete */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "suspend" ? "Suspend Provider" : "Delete Provider"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "suspend"
                ? `Are you sure you want to suspend "${confirmAction?.provider.full_name || "this provider"}"? They will lose access to their dashboard.`
                : `Are you sure you want to delete "${confirmAction?.provider.full_name || "this provider"}"? This action cannot be easily undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className={confirmAction?.type === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-amber-600 text-white hover:bg-amber-700"}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction?.type === "suspend" ? "Suspend" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
