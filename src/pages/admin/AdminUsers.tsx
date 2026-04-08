import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Loader2, UserPlus, Gift, X, Tag, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const TAGS = ["afiliado", "influencer", "promo", "cortesía", "beta"];
const TAG_COLORS: Record<string, string> = {
  afiliado: "bg-blue-500/20 text-blue-400",
  influencer: "bg-purple-500/20 text-purple-400",
  promo: "bg-amber-500/20 text-amber-400",
  cortesía: "bg-emerald-500/20 text-emerald-400",
  beta: "bg-cyan-500/20 text-cyan-400",
};

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userPlans, setUserPlans] = useState<any[]>([]);

  // Create user dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", nombre: "", etiqueta: "", subscribe_days: "30" });
  const [withSubscription, setWithSubscription] = useState(true);
  const [creating, setCreating] = useState(false);

  // Subscription dialog
  const [subUser, setSubUser] = useState<any>(null);
  const [subDays, setSubDays] = useState("30");
  const [settingSub, setSettingSub] = useState(false);

  // Delete user
  const [deleteUser, setDeleteUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const body: Record<string, any> = {
        action: "create_user",
        email: createForm.email,
        password: createForm.password,
        nombre: createForm.nombre,
        etiqueta: createForm.etiqueta || null,
      };
      if (withSubscription && Number(createForm.subscribe_days) > 0) {
        body.subscribe_days = Number(createForm.subscribe_days);
      }
      const { data, error } = await supabase.functions.invoke("admin-users", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(withSubscription ? `Usuario creado con suscripción de ${createForm.subscribe_days} días` : "Usuario creado exitosamente");
      setShowCreate(false);
      setCreateForm({ email: "", password: "", nombre: "", etiqueta: "", subscribe_days: "30" });
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Error al crear usuario");
    }
    setCreating(false);
  };

  const handleSetSubscription = async (active: boolean) => {
    if (!subUser) return;
    setSettingSub(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "set_subscription", user_id: subUser.id, active, days: active ? Number(subDays) : 0 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(active ? `Suscripción activada por ${subDays} días` : "Suscripción desactivada");
      setSubUser(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar suscripción");
    }
    setSettingSub(false);
  };

  const filtered = users.filter(u =>
    (u.nombre || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.etiqueta || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold">Usuarios</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{users.length} registrados</span>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Crear usuario
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, email o etiqueta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Usuario</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Email</th>
                <th className="text-left p-3 text-xs text-muted-foreground font-medium">Etiqueta</th>
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
                  <td className="p-3">
                    <Select
                      value={u.etiqueta || "__none__"}
                      onValueChange={async (v) => {
                        const etiqueta = v === "__none__" ? null : v;
                        try {
                          const { data, error } = await supabase.functions.invoke("admin-users", {
                            body: { action: "set_tag", user_id: u.id, etiqueta },
                          });
                          if (error) throw error;
                          if (data?.error) throw new Error(data.error);
                          toast.success(etiqueta ? `Etiqueta "${etiqueta}" asignada` : "Etiqueta removida");
                          await loadUsers();
                        } catch (err: any) {
                          toast.error(err.message || "Error al cambiar etiqueta");
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-[120px] text-[10px] border-border/50 bg-transparent px-2">
                        <SelectValue>
                          {u.etiqueta ? (
                            <span className={`rounded-full px-1.5 py-0.5 font-semibold ${TAG_COLORS[u.etiqueta] || "bg-muted text-muted-foreground"}`}>
                              {u.etiqueta}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin etiqueta</SelectItem>
                        {TAGS.map(tag => (
                          <SelectItem key={tag} value={tag}>
                            <span className="flex items-center gap-2">
                              <span className={`inline-block h-2 w-2 rounded-full ${TAG_COLORS[tag]?.split(" ")[0] || "bg-muted"}`} />
                              {tag.charAt(0).toUpperCase() + tag.slice(1)}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.suscripcion_activa ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
                      {u.suscripcion_activa ? "Activa" : "Inactiva"}
                    </span>
                    {u.suscripcion_hasta && u.suscripcion_activa && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        hasta {new Date(u.suscripcion_hasta).toLocaleDateString("es-ES")}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(u.creado_en).toLocaleDateString("es-ES")}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSubUser(u)} className="text-amber-500 hover:text-amber-400 p-1" title="Gestionar suscripción">
                        <Gift className="h-4 w-4" />
                      </button>
                      <button onClick={() => viewUser(u)} className="text-primary hover:text-primary/80 p-1" title="Ver perfil">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteUser(u)} className="text-destructive hover:text-destructive/80 p-1" title="Eliminar usuario">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Crear usuario manual
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="cr-nombre">Nombre</Label>
              <Input id="cr-nombre" value={createForm.nombre} onChange={e => setCreateForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" className="mt-1 bg-background border-border" />
            </div>
            <div>
              <Label htmlFor="cr-email">Email *</Label>
              <Input id="cr-email" type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} required placeholder="correo@ejemplo.com" className="mt-1 bg-background border-border" />
            </div>
            <div>
              <Label htmlFor="cr-pass">Contraseña *</Label>
              <Input id="cr-pass" type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} required minLength={6} placeholder="Mínimo 6 caracteres" className="mt-1 bg-background border-border" />
            </div>

            {/* Tag selector */}
            <div>
              <Label>Etiqueta</Label>
              <Select value={createForm.etiqueta} onValueChange={v => setCreateForm(p => ({ ...p, etiqueta: v }))}>
                <SelectTrigger className="mt-1 bg-background border-border">
                  <SelectValue placeholder="Sin etiqueta" />
                </SelectTrigger>
                <SelectContent>
                  {TAGS.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${TAG_COLORS[tag]?.split(" ")[0] || "bg-muted"}`} />
                        {tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subscription toggle */}
            <div className="rounded-lg border border-border p-3 bg-background space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Activar suscripción al crear</Label>
                <Switch checked={withSubscription} onCheckedChange={setWithSubscription} />
              </div>
              {withSubscription && (
                <div>
                  <Label className="text-xs text-muted-foreground">Duración (días)</Label>
                  <div className="flex gap-2 mt-1.5">
                    {["7", "14", "30", "90", "365"].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setCreateForm(p => ({ ...p, subscribe_days: d }))}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${createForm.subscribe_days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">El usuario se crea con email verificado. Ideal para afiliados, influencers y promos.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {withSubscription ? `Crear + ${createForm.subscribe_days}d` : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={!!subUser} onOpenChange={() => setSubUser(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Gestionar suscripción
            </DialogTitle>
          </DialogHeader>
          {subUser && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3 bg-background">
                <p className="font-medium">{subUser.nombre || "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground">{subUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs">
                    Estado: <span className={subUser.suscripcion_activa ? "text-primary" : "text-destructive"}>{subUser.suscripcion_activa ? "Activa" : "Inactiva"}</span>
                  </span>
                  {subUser.etiqueta && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_COLORS[subUser.etiqueta] || "bg-muted text-muted-foreground"}`}>
                      {subUser.etiqueta}
                    </span>
                  )}
                </div>
                {subUser.suscripcion_hasta && subUser.suscripcion_activa && (
                  <p className="text-xs text-muted-foreground mt-1">Hasta {new Date(subUser.suscripcion_hasta).toLocaleDateString("es-ES")}</p>
                )}
              </div>

              <div>
                <Label>Duración de la suscripción (días)</Label>
                <div className="flex gap-2 mt-1.5">
                  {["7", "14", "30", "90", "365"].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSubDays(d)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${subDays === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <Input type="number" value={subDays} onChange={e => setSubDays(e.target.value)} min="1" max="3650" className="mt-2 bg-background border-border w-32" />
              </div>

              <div className="flex justify-between gap-2">
                {subUser.suscripcion_activa && (
                  <Button variant="destructive" onClick={() => handleSetSubscription(false)} disabled={settingSub} className="gap-1.5">
                    {settingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Desactivar
                  </Button>
                )}
                <Button onClick={() => handleSetSubscription(true)} disabled={settingSub} className="gap-1.5 ml-auto">
                  {settingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                  Activar {subDays} días
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <div><span className="text-muted-foreground">Etiqueta:</span> <span>{selectedUser.etiqueta || "—"}</span></div>
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
