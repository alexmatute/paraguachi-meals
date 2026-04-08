import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, BarChart3, Users, CreditCard, ChefHat, Bot, Globe, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Usuarios", url: "/admin/usuarios", icon: Users },
  { title: "Suscripciones", url: "/admin/suscripciones", icon: CreditCard },
  { title: "Recetas", url: "/admin/recetas", icon: ChefHat },
  { title: "Uso de IA", url: "/admin/ia", icon: Bot },
  { title: "Conexiones", url: "/admin/conexiones", icon: Globe },
];

const AdminLayout = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/dashboard");
  }, [loading, user, isAdmin]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarContent>
            <div className="p-4 flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary shrink-0" />
              <span className="font-heading text-sm font-bold text-primary truncate">Admin CRM</span>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Menú</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end={item.url === "/admin"} className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto p-4">
              <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full">
                <LogOut className="h-4 w-4" /> Salir
              </button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b border-border px-4">
            <SidebarTrigger className="mr-3" />
            <span className="text-sm text-muted-foreground">Panel de Administración</span>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
