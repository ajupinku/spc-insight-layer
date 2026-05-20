import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Boxes, Route as RouteIcon, GitBranch, LineChart,
  Gauge, AlertOctagon, Users, Database, GitCommit, CircuitBoard,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const groups: Array<{ label: string; items: Array<{ title: string; url: string; icon: any }> }> = [
  { label: "Intelligence", items: [
    { title: "Command Center",       url: "/",          icon: LayoutDashboard },
    { title: "Product Explorer",     url: "/products",  icon: Boxes },
    { title: "Lot Journey",          url: "/lots",      icon: RouteIcon },
  ]},
  { label: "Process & Quality", items: [
    { title: "Process Intelligence", url: "/processes", icon: GitBranch },
    { title: "Parameter SPC",        url: "/spc",       icon: LineChart },
    { title: "Final Test Yield",     url: "/yield",     icon: Gauge },
    { title: "Spec Violations",      url: "/violations",icon: AlertOctagon },
  ]},
  { label: "Configuration", items: [
    { title: "Process Owner Matrix", url: "/owners",    icon: Users },
    { title: "Database",             url: "/database",  icon: Database },
    { title: "Version & Deploy",     url: "/versions",  icon: GitCommit },
  ]},
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <CircuitBoard className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">AKSPC</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">SPC + Yield · Read-only MES</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map(g => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = item.url === "/" ? path === "/" : path.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
