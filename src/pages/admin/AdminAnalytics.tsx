import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Briefcase, FileText } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export default function AdminAnalytics() {
  const [data, setData] = useState({
    totalUsers: 0,
    seekers: 0,
    providers: 0,
    opportunities: 0,
    applications: 0,
    articles: 0,
    userGrowth: [] as { month: string; count: number }[],
    oppTrends: [] as { month: string; count: number }[],
  });

  useEffect(() => {
    async function fetchAnalytics() {
      const [
        { count: totalUsers },
        { count: seekers },
        { count: providers },
        { count: opportunities },
        { count: applications },
        { count: articles },
        { data: profiles },
        { data: opps },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "seeker"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "provider"),
        supabase.from("opportunities").select("*", { count: "exact", head: true }),
        supabase.from("applications").select("*", { count: "exact", head: true }),
        supabase.from("articles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("created_at").order("created_at"),
        supabase.from("opportunities").select("created_at, category").order("created_at"),
      ]);

      const groupByMonth = (items: any[]) => {
        const months = new Map<string, number>();
        (items || []).forEach((item) => {
          const month = new Date(item.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" });
          months.set(month, (months.get(month) || 0) + 1);
        });
        return Array.from(months.entries()).map(([month, count]) => ({ month, count }));
      };

      setData({
        totalUsers: totalUsers || 0,
        seekers: seekers || 0,
        providers: providers || 0,
        opportunities: opportunities || 0,
        applications: applications || 0,
        articles: articles || 0,
        userGrowth: groupByMonth(profiles || []),
        oppTrends: groupByMonth(opps || []),
      });
    }
    fetchAnalytics();
  }, []);

  const stats = [
    { label: "Total Users", value: data.totalUsers, icon: Users, sub: `${data.seekers} seekers, ${data.providers} providers` },
    { label: "Opportunities", value: data.opportunities, icon: Briefcase, sub: "Total posted" },
    { label: "Applications", value: data.applications, icon: TrendingUp, sub: "Total submitted" },
    { label: "Articles", value: data.articles, icon: FileText, sub: "Total published" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform performance overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {data.userGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opportunity Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {data.oppTrends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.oppTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Opportunities" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs */}
      <ActivityLogsSection />
    </div>
  );
}

function ActivityLogsSection() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("admin_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setLogs(data || []));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Admin Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{log.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.target_type && `${log.target_type} `}
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
