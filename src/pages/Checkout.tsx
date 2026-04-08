import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChefHat, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Checkout = () => {
  const { t } = useI18n();
  const { user, subscribed, loading } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handleCheckout = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
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
      <div className="w-full max-w-md text-center">
        <ChefHat className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-6 font-heading text-2xl font-bold">{t("checkout.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("checkout.plan")}</p>
        <div className="mt-8 card-surface p-6">
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
          <p className="mt-3 text-xs text-muted-foreground">{t("checkout.secure")}</p>
        </div>
        {!user && (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("checkout.needAccount")}{" "}
            <Link to="/register" className="text-primary hover:underline">{t("register.button")}</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default Checkout;
