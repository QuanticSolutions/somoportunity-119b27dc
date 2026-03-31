import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const statusColors: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  shortlisted: "bg-accent text-accent-foreground",
  interview: "bg-primary/15 text-primary",
  hired: "bg-green-100 text-green-800",
  denied: "bg-destructive/15 text-destructive",
};

interface Application {
  id: string;
  status: string;
  created_at: string;
  opportunity: { title: string; company: string | null } | null;
}

export default function AppliedJobs() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("applications")
      .select("id, status, created_at, opportunity:opportunities(title, company)")
      .eq("seeker_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setApps((data as unknown as Application[]) || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
        <FileCheck size={22} className="text-primary" /> Applied Jobs
      </h1>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : apps.length === 0 ? (
        <Card className="glass-card text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">No applications yet. Start exploring opportunities!</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Applied</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id} className="hover:bg-accent/50 transition-colors">
                  <TableCell className="font-medium">{app.opportunity?.title || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{app.opportunity?.company || "—"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[app.status] || "bg-muted text-muted-foreground"}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </motion.div>
  );
}
