import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, User, LayoutDashboard, Settings, LogOut, Search, Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import LoginModal from "@/components/LoginModal";
import NotificationBell from "@/components/NotificationBell";

const opportunityItems = [
  { label: "Jobs", category: "job", desc: "Career opportunities across industries" },
  { label: "Scholarships", category: "scholarship", desc: "Funded education programs" },
  { label: "Grants", category: "grant", desc: "Project & research funding" },
  { label: "Fellowships", category: "fellowship", desc: "Leadership & research programs" },
  { label: "Internships", category: "internship", desc: "Professional development" },
  { label: "Workshops", category: "workshop", desc: "Skill-building events" },
  { label: "Conferences", category: "conference", desc: "Networking events" },
];

const serviceItems = [
  { label: "Hire Talent", href: "/services/hire-talent", desc: "Recruit qualified professionals" },
  { label: "Technical Writing", href: "/services/technical-writing", desc: "Professional documentation services" },
];

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Jobs", href: "/opportunities?category=job" },
];

const navLinksAfterDropdowns = [
  { label: "Articles", href: "/articles" },
];

const navLinksEnd = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Submit Content", href: "/signup" },
];

function getDashboardPath(role?: string): string {
  if (!role) return "/dashboard/seeker";
  if (["admin", "editor", "viewer"].includes(role)) return "/admin";
  if (role === "provider") return "/dashboard/provider";
  return "/dashboard/seeker";
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOppOpen, setMobileOppOpen] = useState(false);
  const [mobileSvcOpen, setMobileSvcOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const dashboardPath = getDashboardPath(profile?.role);

  const profilePath = profile?.role === "provider"
    ? "/dashboard/provider/settings"
    : ["admin", "editor", "viewer"].includes(profile?.role || "")
    ? "/admin/settings"
    : "/dashboard/seeker/profile";

  const settingsPath = profile?.role === "provider"
    ? "/dashboard/provider/settings"
    : ["admin", "editor", "viewer"].includes(profile?.role || "")
    ? "/admin/settings"
    : "/dashboard/seeker/security";

  const notificationsPath = ["admin", "editor", "viewer"].includes(profile?.role || "")
    ? "/admin"
    : profile?.role === "provider"
    ? "/dashboard/provider"
    : "/dashboard/seeker/notifications";

  const UserMenu = ({ align = "end" as const, compact = false }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-200 focus:outline-none">
          <Avatar className={compact ? "h-8 w-8" : "h-9 w-9"}>
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56 rounded-xl border-border/50 shadow-[var(--card-shadow-hover)] p-1">
        <div className="px-3 py-2.5">
          <p className="text-sm font-semibold text-foreground truncate">{profile?.full_name || "User"}</p>
          {!compact && <p className="text-xs text-muted-foreground truncate">{user?.email}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(profilePath)} className="cursor-pointer gap-2.5 rounded-lg hover:bg-accent">
          <User size={14} /> My Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(dashboardPath)} className="cursor-pointer gap-2.5 rounded-lg hover:bg-accent">
          <LayoutDashboard size={14} /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(settingsPath)} className="cursor-pointer gap-2.5 rounded-lg hover:bg-accent">
          <Settings size={14} /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-2.5 rounded-lg text-destructive hover:bg-destructive/10">
          <LogOut size={14} /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const NavButton = ({ label, href }: { label: string; href: string }) => {
    const isActive = window.location.pathname === href || (href !== "/" && window.location.pathname.startsWith(href.split("?")[0]));
    return (
      <button
        onClick={() => navigate(href)}
        className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
        }`}
      >
        {label}
        <span className={`absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-primary transition-transform duration-200 origin-left ${
          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
        }`} />
      </button>
    );
  };

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 pt-3">
          <div className="glass-nav rounded-2xl border border-border/60 shadow-[var(--nav-shadow)] px-5 py-2.5">
            <div className="flex items-center justify-between">
              <a href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight shrink-0">
                <span className="text-gradient">Somopportunity</span>
              </a>

              <nav className="hidden items-center gap-0.5 lg:flex">
                {navLinks.map((l) => <NavButton key={l.label} {...l} />)}

                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent hover:bg-accent/50 rounded-lg h-auto py-2 px-3">
                        Opportunities
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid w-72 gap-0.5 p-2">
                          {opportunityItems.map((item) => (
                            <button key={item.label} onClick={() => navigate(`/opportunities?category=${item.category}`)}
                              className="flex flex-col rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent">
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                              <span className="text-xs text-muted-foreground">{item.desc}</span>
                            </button>
                          ))}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>

                {navLinksAfterDropdowns.map((l) => <NavButton key={l.label} {...l} />)}

                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent hover:bg-accent/50 rounded-lg h-auto py-2 px-3">
                        Services
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="grid w-64 gap-0.5 p-2">
                          {serviceItems.map((item) => (
                            <button key={item.label} onClick={() => navigate(item.href)}
                              className="flex flex-col rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent">
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                              <span className="text-xs text-muted-foreground">{item.desc}</span>
                            </button>
                          ))}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>

                {navLinksEnd.map((l) => <NavButton key={l.label} {...l} />)}
              </nav>

              <div className="hidden items-center gap-1.5 lg:flex">
                <button onClick={() => navigate("/opportunities")}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors" aria-label="Search">
                  <Search size={18} />
                </button>

                {!loading && user && (
                  <button onClick={() => navigate(notificationsPath)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors" aria-label="Notifications">
                    <Bell size={18} />
                  </button>
                )}

                {!loading && !user && (
                  <>
                    <Button variant="ghost" size="sm" className="text-muted-foreground font-medium rounded-lg hover:bg-accent/50 ml-1" onClick={() => setLoginOpen(true)}>
                      Log In
                    </Button>
                    <Button size="sm" className="btn-gradient font-semibold px-5 rounded-xl shadow-sm" onClick={() => navigate("/signup")}>
                      Join
                    </Button>
                  </>
                )}
                {!loading && user && <UserMenu />}
              </div>

              <div className="flex items-center gap-3 lg:hidden">
                {!loading && user && <UserMenu compact />}
                <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-foreground hover:bg-accent/50 transition-colors" aria-label="Menu">
                  {open ? <X size={22} /> : <Menu size={22} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {open && (
          <div className="mx-auto max-w-7xl px-4 pt-2 lg:hidden">
            <nav className="glass-nav flex flex-col gap-1 rounded-2xl border border-border/60 shadow-[var(--nav-shadow)] p-4 animate-fade-in">
              {navLinks.map((l) => (
                <button key={l.label} onClick={() => { setOpen(false); navigate(l.href); }}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground text-left hover:bg-accent/50 transition-colors">
                  {l.label}
                </button>
              ))}

              <Collapsible open={mobileOppOpen} onOpenChange={setMobileOppOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
                  Opportunities <ChevronDown size={16} className={`transition-transform ${mobileOppOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-3">
                  {opportunityItems.map((item) => (
                    <button key={item.label} onClick={() => { setOpen(false); navigate(`/opportunities?category=${item.category}`); }}
                      className="block w-full rounded-lg text-left text-sm text-muted-foreground py-2 px-3 hover:bg-accent/50 hover:text-foreground transition-colors">
                      {item.label}
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {navLinksAfterDropdowns.map((l) => (
                <button key={l.label} onClick={() => { setOpen(false); navigate(l.href); }}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground text-left hover:bg-accent/50 transition-colors">
                  {l.label}
                </button>
              ))}

              <Collapsible open={mobileSvcOpen} onOpenChange={setMobileSvcOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
                  Services <ChevronDown size={16} className={`transition-transform ${mobileSvcOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-3">
                  {serviceItems.map((item) => (
                    <button key={item.label} onClick={() => { setOpen(false); navigate(item.href); }}
                      className="block w-full rounded-lg text-left text-sm text-muted-foreground py-2 px-3 hover:bg-accent/50 hover:text-foreground transition-colors">
                      {item.label}
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {navLinksEnd.map((l) => (
                <button key={l.label} onClick={() => { setOpen(false); navigate(l.href); }}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground text-left hover:bg-accent/50 transition-colors">
                  {l.label}
                </button>
              ))}

              {!loading && !user && (
                <div className="flex flex-col gap-2 pt-3 border-t border-border/60">
                  <Button variant="outline" className="border-border text-foreground font-medium w-full rounded-xl" onClick={() => { setOpen(false); setLoginOpen(true); }}>
                    Log In
                  </Button>
                  <Button className="btn-gradient font-semibold w-full rounded-xl" onClick={() => { setOpen(false); navigate("/signup"); }}>
                    Join
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
