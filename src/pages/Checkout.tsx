import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Loader2, CheckCircle, Check } from "lucide-react";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  { id: "weekly", priceKey: "checkout.priceWeekly", periodKey: "checkout.periodWeekly", price: "$10" },
  { id: "biweekly", priceKey: "checkout.priceBiweekly", periodKey: "checkout.periodBiweekly", price: "$20", popular: false },
  { id: "monthly", priceKey: "checkout.priceMonthly", periodKey: "checkout.periodMonthly", price: "$35", popular: true },
];

const Checkout = () => {
  const { t } = useI18n();
  const { user, subscribed, loading } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  const handleCheckout = async () => {
    if (!user) { navigate("/login"); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: selectedPlan },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(t("checkout.error") + (err.message || ""));
    } finally {
      setProcessing(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-6 font-heading text-2xl font-bold">{t("checkout.activeTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("checkout.activeDesc")}</p>
          <Link to="/onboarding" className="block mt-6">
            <Button className="w-full bg-primary text-primary-foreground font-semibold">{t("checkout.goOnboarding")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-8">
          <Logo size={48} className="mx-auto" />
          <h1 className="mt-4 font-heading text-2xl font-bold">{t("checkout.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("checkout.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative card-surface p-5 rounded-xl text-left transition-all border-2 ${
                selectedPlan === plan.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-0.5 rounded-full">
                  {t("checkout.popular")}
                </span>
              )}
              <p className="font-heading text-2xl font-bold">{plan.price}</p>
              <p className="text-sm text-muted-foreground">{t(plan.periodKey)}</p>
              {selectedPlan === plan.id && (
                <Check className="absolute top-3 right-3 h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="card-surface p-6 max-w-md mx-auto">
          <ul className="text-left text-sm text-muted-foreground space-y-2 mb-6">
            <li>✅ {t("checkout.f1")}</li>
            <li>✅ {t("checkout.f2")}</li>
            <li>✅ {t("checkout.f3")}</li>
            <li>✅ {t("checkout.f4")}</li>
          </ul>
          <Button
            onClick={handleCheckout}
            disabled={processing || loading}
            className="w-full bg-primary text-primary-foreground font-semibold"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {t("checkout.payButton")}
              </>
            )}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground text-center">{t("checkout.secure")}</p>
        </div>

        {!user && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("checkout.needAccount")}{" "}
            <Link to="/register" className="text-primary hover:underline">{t("register.button")}</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Checkout;
