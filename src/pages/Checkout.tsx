import { Link } from "react-router-dom";
import { ChefHat, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const Checkout = () => {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <ChefHat className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-6 font-heading text-2xl font-bold">{t("checkout.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("checkout.plan")}</p>
        <div className="mt-8 card-surface p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">{t("checkout.stripe")}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("checkout.soon")}</p>
          <Link to="/onboarding" className="block mt-6">
            <Button className="w-full bg-primary text-primary-foreground font-semibold">{t("checkout.continue")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
