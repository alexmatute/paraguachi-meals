import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Loader2 } from "lucide-react";

const AdminConnections = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("sesiones").select("*").order("inicio", { ascending: false }).limit(50);
      setSessions(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Conexiones</h1>
      {sessions.length > 0 ? (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">Fecha</th>
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">IP</th>
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">País</th>
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">Ciudad</th>
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">Dispositivo</th>
              <th className="text-left p-3 text-xs text-muted-foreground font-medium">Navegador</th>
            </tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(s.inicio).toLocaleDateString("es-ES")}</td>
                  <td className="p-3 text-xs">{s.ip || "—"}</td>
                  <td className="p-3 text-xs">{s.pais || "—"}</td>
                  <td className="p-3 text-xs">{s.ciudad || "—"}</td>
                  <td className="p-3 text-xs">{s.dispositivo || "—"}</td>
                  <td className="p-3 text-xs">{s.navegador || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-surface p-8 text-center">
          <Globe className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Sin sesiones registradas aún.</p>
        </div>
      )}
    </div>
  );
};

export default AdminConnections;
