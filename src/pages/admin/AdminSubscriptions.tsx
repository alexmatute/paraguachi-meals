import { useEffect, useState } from "react";
import { Crown, Clock, Users, Plus, Ban, CalendarPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface SubscribedUser {
  id: string;
  email: string | null;
  nombre: string | null;
  etiqueta: string | null;
  suscripcion_activa: boolean | null;
  suscripcion_hasta: string | null;
  creado_en: string | null;
}

const TAG_COLORS: Record<string, string> = {
  afiliado: "bg-blue-100 text-blue-800",
  influencer: "bg-purple-100 text-purple-800",
  promo: "bg-amber-100 text-amber-800",
  beta: "bg-emerald-100 text-emerald-800",
};

const AdminSubscriptions = () => {
  const [users, setUsers] = useState<SubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeUser, setRevokeUser] = useState<SubscribedUser | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [extendUser, setExtendUser] = useState<SubscribedUser | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, nombre, etiqueta, suscripcion_activa, suscripcion_hasta, creado_en")
      .order("suscripcion_hasta", { ascending: false, nullsFirst: false });
    setUsers(data || []);
    setLoading(false);
  };

  const handleRevoke = async () => {
    if (!revokeUser) return;
    setRevoking(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "set_subscription", user_id: revokeUser.id, active: false },
    });
    setRevoking(false);
    setRevokeUser(null);
    if (error) {
      toast.error("Error al revocar suscripción");
    } else {
      toast.success("Suscripción revocada");
      await loadUsers();
    }
  };

  const handleExtend = async () => {
    if (!extendUser) return;
    setExtending(true);
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action: "set_subscription", user_id: extendUser.id, active: true, days: Number(extendDays) },
    });
    setExtending(false);
    setExtendUser(null);
    if (error) {
      toast.error("Error al extender suscripción");
    } else {
      toast.success(`Suscripción extendida ${extendDays} días`);
      await loadUsers();
    }
  };

  const now = new Date();
  const activeUsers = users.filter(
    (u) => u.suscripcion_activa && u.suscripcion_hasta && new Date(u.suscripcion_hasta) > now
  );
  const expiredUsers = users.filter(
    (u) => u.suscripcion_hasta && new Date(u.suscripcion_hasta) <= now
  );
  const neverSubscribed = users.filter((u) => !u.suscripcion_hasta);

  const mrr = activeUsers.length * 35;
  const arr = mrr * 12;
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const newThisMonth = activeUsers.filter((u) => {
    if (!u.creado_en) return false;
    const d = new Date(u.creado_en);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const isExpiringSoon = (hasta: string) => {
    const diff = new Date(hasta).getTime() - now.getTime();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  };

  const ActionButtons = ({ user, showRevoke = true }: { user: SubscribedUser; showRevoke?: boolean }) => (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 text-xs"
        onClick={() => { setExtendUser(user); setExtendDays("30"); }}
      >
        <CalendarPlus className="h-3 w-3" />
        Extender
      </Button>
      {showRevoke && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10"
          onClick={() => setRevokeUser(user)}
        >
          <Ban className="h-3 w-3" />
          Revocar
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Suscripciones</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Activas</p>
          <p className="font-heading text-2xl font-bold text-primary">{activeUsers.length}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">MRR estimado</p>
          <p className="font-heading text-2xl font-bold text-primary">${mrr}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">ARR Proyectado</p>
          <p className="font-heading text-2xl font-bold">${arr}</p>
        </div>
        <div className="card-surface p-5">
          <p className="text-xs text-muted-foreground">Nuevas este mes</p>
          <p className="font-heading text-2xl font-bold">{newThisMonth}</p>
        </div>
      </div>

      {/* Active */}
      <div className="card-surface overflow-hidden">
        <div className="flex items-center gap-2 border-b p-4">
          <Crown className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold">Suscripciones activas ({activeUsers.length})</h2>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : activeUsers.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No hay suscripciones activas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Etiqueta</th>
                  <th className="p-3">Vence</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3 font-medium">{u.nombre || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      {u.etiqueta ? (
                        <Badge variant="outline" className={TAG_COLORS[u.etiqueta] || ""}>{u.etiqueta}</Badge>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      {u.suscripcion_hasta ? format(new Date(u.suscripcion_hasta), "dd MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="p-3">
                      {u.suscripcion_hasta && isExpiringSoon(u.suscripcion_hasta) ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">Por vencer</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Activa</Badge>
                      )}
                    </td>
                    <td className="p-3"><ActionButtons user={u} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expired */}
      {expiredUsers.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b p-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Expiradas ({expiredUsers.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Venció</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {expiredUsers.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3 font-medium">{u.nombre || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 text-destructive">
                      {u.suscripcion_hasta ? format(new Date(u.suscripcion_hasta), "dd MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="p-3"><ActionButtons user={u} showRevoke={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Never subscribed */}
      {neverSubscribed.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-heading font-semibold">Sin suscripción ({neverSubscribed.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Registro</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {neverSubscribed.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td className="p-3 font-medium">{u.nombre || "—"}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      {u.creado_en ? format(new Date(u.creado_en), "dd MMM yyyy", { locale: es }) : "—"}
                    </td>
                    <td className="p-3"><ActionButtons user={u} showRevoke={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      <AlertDialog open={!!revokeUser} onOpenChange={(o) => !o && setRevokeUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se desactivará la suscripción de <strong>{revokeUser?.nombre || revokeUser?.email}</strong>. El usuario perderá acceso inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} disabled={revoking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {revoking ? "Revocando…" : "Revocar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extend dialog */}
      <Dialog open={!!extendUser} onOpenChange={(o) => !o && setExtendUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extender suscripción</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Usuario: <strong>{extendUser?.nombre || extendUser?.email}</strong>
          </p>
          <Select value={extendDays} onValueChange={setExtendDays}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="14">14 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
              <SelectItem value="365">1 año</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendUser(null)} disabled={extending}>Cancelar</Button>
            <Button onClick={handleExtend} disabled={extending}>
              {extending ? "Extendiendo…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptions;
