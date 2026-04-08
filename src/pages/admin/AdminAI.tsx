import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Loader2 } from "lucide-react";

const AdminAI = () => {
  const [usage, setUsage] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalTokens: 0, totalCost: 0, avgPerPlan: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("token_usage").select("*").order("creado_en", { ascending: false }).limit(50);
      const records = data || [];
      setUsage(records);
      const totalTokens = records.reduce((s: number, r: any) => s + (r.tokens_total || 0), 0);
      const totalCost = records.reduce((s: number, r: any) => s + (parseFloat(r.costo_usd) || 0), 0);
      setStats({ totalTokens, totalCost, avgPerPlan: records.length ? Math.round(totalTokens / records.length) : 0 });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Uso de IA</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Tokens totales</p>
          <p className="font-heading text-2xl font-bold text-primary">{stats.totalTokens.toLocaleString()}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Costo estimado</p>
          <p className="font-heading text-2xl font-bold text-secondary">${stats.totalCost.toFixed(4)}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Promedio por plan</p>
          <p className="font-heading text-2xl font-bold">{stats.avgPerPlan.toLocaleString()}</p>
        </div>
      </div>
      {usage.length > 0 ? (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">Fecha</th>
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">Modelo</th>
              <th className="text-right p-3 text-xs text-muted-foreground font-medium">Input</th>
              <th className="text-right p-3 text-xs text-muted-foreground font-medium">Output</th>
              <th className="text-right p-3 text-xs text-muted-foreground font-medium">Total</th>
              <th className="text-right p-3 text-xs text-muted-foreground font-medium">Costo</th>
            </tr></thead>
            <tbody>
              {usage.map(u => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(u.creado_en).toLocaleDateString("es-ES")}</td>
                  <td className="p-3 text-xs">{u.modelo}</td>
                  <td className="p-3 text-xs text-right">{(u.tokens_input || 0).toLocaleString()}</td>
                  <td className="p-3 text-xs text-right">{(u.tokens_output || 0).toLocaleString()}</td>
                  <td className="p-3 text-xs text-right font-medium">{(u.tokens_total || 0).toLocaleString()}</td>
                  <td className="p-3 text-xs text-right text-secondary">${parseFloat(u.costo_usd || 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-surface p-8 text-center">
          <Bot className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Sin datos de uso aún. Se registrarán automáticamente al generar planes.</p>
        </div>
      )}
    </div>
  );
};

export default AdminAI;
