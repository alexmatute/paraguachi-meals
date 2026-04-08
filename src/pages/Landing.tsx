import { Link } from "react-router-dom";
import { Check, ChefHat, Clock, Globe, Heart, Leaf, ListChecks, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const Landing = () => {
  const { t } = useI18n();

  const features = [
    { icon: Sparkles, text: t("landing.f1") },
    { icon: ShoppingCart, text: t("landing.f2") },
    { icon: ListChecks, text: t("landing.f3") },
    { icon: ShoppingCart, text: t("landing.f4") },
    { icon: Heart, text: t("landing.f5") },
    { icon: Clock, text: t("landing.f6") },
    { icon: Leaf, text: t("landing.f7") },
    { icon: Globe, text: t("landing.f8") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="font-heading text-xl font-bold text-primary">Paraguachi Meals Prep</span>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher />
            <Link to="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">{t("nav.login")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="container py-20 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up">
            {t("landing.hero")}{" "}
            <span className="text-gradient-primary">{t("landing.heroHighlight")}</span>{" "}
            {t("landing.heroEnd")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            {t("landing.sub")}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-md animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="card-surface p-8 text-center glow-primary">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">{t("landing.pricing")}</p>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="font-heading text-5xl font-extrabold text-foreground">$35</span>
              <span className="text-muted-foreground">{t("landing.priceMonth")}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.cancelAnytime")}</p>
            <Link to="/register" className="block mt-8">
              <Button size="lg" className="w-full bg-primary text-primary-foreground font-heading font-semibold text-base hover:bg-primary/90 h-12">
                {t("landing.cta")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 bg-card/30 py-20">
        <div className="container">
          <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">{t("landing.featuresTitle")}</h2>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-foreground/80">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-bold text-primary">Paraguachi Meals Prep</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">{t("footer.credits")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
