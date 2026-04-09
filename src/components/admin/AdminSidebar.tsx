import {
  LayoutDashboard,
  Briefcase,
  FileText,
  CreditCard,
  BarChart3,
  Users,
  Settings,
  Inbox,
  Shield,
  Globe,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const overviewItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
];

const managementItems = [
  { title: "Content", url: "/admin/content", icon: FileText },
  { title: "Opportunities", url: "/admin/opportunities", icon: Briefcase },
  { title: "Submissions", url: "/admin/submissions", icon: Inbox },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Site Pages", url: "/admin/pages", icon: Globe },
];

const analyticsItems = [
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Providers", url: "/admin/providers", icon: Shield },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile } = useAuth();

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const renderGroup = (label: string, items: typeof overviewItems) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/admin"}
                  className="hover:bg-accent/50"
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="pt-4">
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                S
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Admin Panel</p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
            </div>
          </div>
        )}
        {renderGroup("Overview", overviewItems)}
        {renderGroup("Management", managementItems)}
        {renderGroup("Analytics & Settings", analyticsItems)}
      </SidebarContent>
    </Sidebar>
  );
}
