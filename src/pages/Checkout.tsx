import { Link } from "react-router-dom";
import { ChefHat, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const Checkout = () => {
  // Stripe checkout will be integrated after Stripe is enabled
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <ChefHat className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-6 font-heading text-2xl font-bold">Activar suscripción</h1>
        <p className="mt-2 text-muted-foreground">Plan mensual — $35/mes</p>
        <div className="mt-8 card-surface p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">Checkout con Stripe</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            La integración de pagos se activará próximamente.
          </p>
          <Link to="/onboarding" className="block mt-6">
            <Button className="w-full bg-primary text-primary-foreground font-semibold">
              Continuar al onboarding →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
