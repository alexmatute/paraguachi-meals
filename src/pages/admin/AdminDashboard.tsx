import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, CreditCard, ChefHat, Bot, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#7EC850", "#E8A830", "#ef4444", "#3b82f6", "#a855f7", "#ec4899"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalPlans: 0, plansMonth: 0 });
  const [usersByGoal, setUsersByGoal] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: activeUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("suscripcion_activa", true);
    const { count: totalPlans } = await supabase.from("planes").select("*", { count: "exact", head: true });

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const { count: plansMonth } = await supabase.from("planes").select("*", { count: "exact", head: true }).gte("creado_en", monthStart.toISOString());

    setStats({ totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, totalPlans: totalPlans || 0, plansMonth: plansMonth || 0 });

    // Goals distribution
    const { data: prefs } = await supabase.from("preferencias").select("objetivo");
    const goalMap: Record<string, number> = {};
    (prefs || []).forEach((p: any) => { if (p.objetivo) goalMap[p.objetivo] = (goalMap[p.objetivo] || 0) + 1; });
    setUsersByGoal(Object.entries(goalMap).map(([name, value]) => ({ name, value })));

    // Recent plans
    const { data: recent } = await supabase.from("planes").select("id, creado_en, usuario_id, ingredientes").order("creado_en", { ascending: false }).limit(10);
    setRecentActivity(recent || []);
  };

  const KPICard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
    <div className="card-surface p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard icon={Users} label="Total usuarios" value={stats.totalUsers} color="bg-primary/20 text-primary" />
        <KPICard icon={TrendingUp} label="Usuarios activos" value={stats.activeUsers} color="bg-emerald-500/20 text-emerald-400" />
        <KPICard icon={ChefHat} label="Total recetas" value={stats.totalPlans} color="bg-secondary/20 text-secondary" />
        <KPICard icon={Bot} label="Recetas este mes" value={stats.plansMonth} color="bg-blue-500/20 text-blue-400" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Goals Distribution */}
        <div className="card-surface p-5">
          <h3 className="font-heading text-sm font-bold mb-4">Distribución por objetivo</h3>
          {usersByGoal.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={usersByGoal} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {usersByGoal.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sin datos aún</p>}
        </div>

        {/* Recent Activity */}
        <div className="card-surface p-5">
          <h3 className="font-heading text-sm font-bold mb-4">Actividad reciente</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {recentActivity.length > 0 ? recentActivity.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/50 pb-2">
                <span className="text-[10px]">{new Date(a.creado_en).toLocaleDateString("es-ES")}</span>
                <span className="truncate flex-1">{a.ingredientes?.slice(0, 60) || "Plan generado"}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground text-center py-8">Sin actividad aún</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
