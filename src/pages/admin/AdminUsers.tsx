import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPlans, setUserPlans] = useState<any[]>([]);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("creado_en", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const viewUser = async (user: any) => {
    setSelectedUser(user);
    const { data } = await supabase.from("planes").select("id, creado_en, semanas, ingredientes").eq("usuario_id", user.id).order("creado_en", { ascending: false });
    setUserPlans(data || []);
  };

  const filtered = users.filter(u =>
    (u.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Usuarios</h1>
        <span className="text-sm text-muted-foreground">{users.length} registrados</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Usuario</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Email</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">País</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Suscripción</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Registro</th>
                <th className="text-right p-3 text-xs text-muted-foreground font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {u.foto_perfil ? <img src={u.foto_perfil} className="h-full w-full object-cover" /> : <span className="text-xs font-bold text-muted-foreground">{(u.nombre || "U")[0]?.toUpperCase()}</span>}
                      </div>
                      <span className="font-medium">{u.nombre || "Sin nombre"}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3 text-muted-foreground">{u.pais || "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.suscripcion_activa ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                      {u.suscripcion_activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(u.creado_en).toLocaleDateString("es-ES")}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => viewUser(u)} className="text-primary hover:text-primary/80"><Eye className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Perfil de {selectedUser?.nombre || "Usuario"}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Email:</span> <span>{selectedUser.email}</span></div>
                <div><span className="text-muted-foreground">Teléfono:</span> <span>{selectedUser.telefono || "—"}</span></div>
                <div><span className="text-muted-foreground">Ciudad:</span> <span>{selectedUser.ciudad || "—"}</span></div>
                <div><span className="text-muted-foreground">País:</span> <span>{selectedUser.pais || "—"}</span></div>
                <div><span className="text-muted-foreground">Peso:</span> <span>{selectedUser.peso_kg ? `${selectedUser.peso_kg} kg` : "—"}</span></div>
                <div><span className="text-muted-foreground">Altura:</span> <span>{selectedUser.altura_cm ? `${selectedUser.altura_cm} cm` : "—"}</span></div>
              </div>
              <div>
                <h4 className="font-heading font-semibold mb-2">Planes generados ({userPlans.length})</h4>
                {userPlans.length > 0 ? (
                  <div className="space-y-2">
                    {userPlans.map(p => (
                      <div key={p.id} className="border border-border rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{new Date(p.creado_en).toLocaleDateString("es-ES")}</span>
                          <span className="text-xs">{p.semanas} semanas</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.ingredientes}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-muted-foreground">Sin planes</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
