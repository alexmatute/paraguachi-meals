import { CreditCard } from "lucide-react";

const AdminSubscriptions = () => (
  <div className="space-y-6">
    <h1 className="font-heading text-2xl font-bold">Suscripciones</h1>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="card-surface p-5">
        <p className="text-xs text-muted-foreground">MRR</p>
        <p className="font-heading text-2xl font-bold text-primary">$0</p>
      </div>
      <div className="card-surface p-5">
        <p className="text-xs text-muted-foreground">ARR Proyectado</p>
        <p className="font-heading text-2xl font-bold">$0</p>
      </div>
      <div className="card-surface p-5">
        <p className="text-xs text-muted-foreground">Nuevas este mes</p>
        <p className="font-heading text-2xl font-bold">0</p>
      </div>
    </div>
    <div className="card-surface p-8 text-center">
      <CreditCard className="mx-auto h-10 w-10 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">Los datos de suscripción se mostrarán cuando Stripe esté configurado.</p>
    </div>
  </div>
);

export default AdminSubscriptions;
