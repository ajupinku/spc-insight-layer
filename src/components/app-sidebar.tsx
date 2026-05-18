import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Grid3x3, LineChart, History, AlertOctagon,
  Users, MailWarning, Database, ShieldCheck, BookOpen, Cpu,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Executive Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Process Matrix", url: "/processes", icon: Grid3x3 },
  { title: "Parameter SPC", url: "/spc", icon: LineChart },
  { title: "Lot History Recall", url: "/lot-history", icon: History },
  { title: "Spec Violation Center", url: "/violations", icon: AlertOctagon },
  { title: "Process Owner Management", url: "/owners", icon: Users },
  { title: "Email Alert Rules", url: "/alerts", icon: MailWarning },
  { title: "MES Connection Setup", url: "/mes", icon: Database },
  { title: "Validation & Audit Log", url: "/audit", icon: ShieldCheck },
  { title: "Help / Workflow Guide", url: "/help", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Cpu className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">SNTTW Connect</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">SPC Plug-in · MES</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
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
      </SidebarContent>
    </Sidebar>
  );
}
