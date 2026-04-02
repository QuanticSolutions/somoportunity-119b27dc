import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

export default function AdminOpportunities() {
  const navigate = useNavigate();
  const [opps, setOpps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOpps = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("opportunities")
      .select("*, profiles!opportunities_provider_id_fkey(full_name)")
      .order("created_at", { ascending: false });
    setOpps(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchOpps(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("opportunities").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const adminUser = (await supabase.auth.getUser()).data.user;
    await supabase.from("admin_logs").insert({
      admin_id: adminUser?.id,
      action: `Opportunity ${status}`,
      target_id: id,
      target_type: "opportunity",
    });

    toast({ title: `Opportunity ${status}` });
    fetchOpps();
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "draft": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Opportunity Management</h1>
          <p className="text-sm text-muted-foreground">Manage all opportunities on the platform</p>
        </div>
        <Button className="btn-gradient" onClick={() => navigate("/admin/opportunities/create")}>
          <Plus size={18} className="mr-1" /> Create Opportunity
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Opportunities ({opps.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opps.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-medium max-w-48 truncate">{opp.title}</TableCell>
                    <TableCell>{(opp.profiles as any)?.full_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{opp.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(opp.status)}>{opp.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {opp.deadline ? new Date(opp.deadline).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(opp.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {opp.status !== "approved" && (
                          <Button size="sm" onClick={() => updateStatus(opp.id, "approved")}>Approve</Button>
                        )}
                        {opp.status !== "rejected" && (
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(opp.id, "rejected")}>Reject</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
