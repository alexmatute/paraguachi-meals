import { Link } from "react-router-dom";
import { Check, Clock, Crown, Globe, Heart, Leaf, ListChecks, ShoppingCart, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import Logo from "@/components/Logo";

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

  const plans = [
    {
      id: "weekly",
      price: "$10",
      period: t("landing.planWeeklyPeriod"),
      label: t("landing.planWeeklyLabel"),
      perDay: t("landing.planWeeklyPerDay"),
      order: "order-3 sm:order-1",
    },
    {
      id: "monthly",
      price: "$35",
      period: t("landing.planMonthlyPeriod"),
      label: t("landing.planMonthlyLabel"),
      perDay: t("landing.planMonthlyPerDay"),
      featured: true,
      order: "order-1 sm:order-2",
    },
    {
      id: "biweekly",
      price: "$20",
      period: t("landing.planBiweeklyPeriod"),
      label: t("landing.planBiweeklyLabel"),
      perDay: t("landing.planBiweeklyPerDay"),
      order: "order-2 sm:order-3",
    },
  ];

  const included = [
    t("checkout.f1"),
    t("checkout.f2"),
    t("checkout.f3"),
    t("checkout.f4"),
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <LangSwitcher />
            <Link to="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">{t("nav.login")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
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
      </section>

      {/* Pricing Cards */}
      <section className="container pb-20">
        <h2 className="text-center font-heading text-2xl font-bold md:text-3xl mb-4 animate-fade-in-up">
          {t("landing.pricingTitle")}
        </h2>
        <p className="text-center text-muted-foreground mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {t("landing.cancelAnytime")}
        </p>

        <div className="mx-auto max-w-4xl grid gap-6 sm:grid-cols-3 items-end">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`${plan.order} animate-fade-in-up`}
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >
              <div
                className={`
                  relative rounded-2xl border transition-all duration-500 ease-out
                  hover:translate-y-[-8px] hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.3)]
                  group cursor-default
                  ${plan.featured
                    ? "border-primary bg-card p-8 sm:p-10 scale-[1.02] shadow-[0_0_40px_hsl(var(--primary)/0.12)]"
                    : "border-border/60 bg-card/70 p-6 sm:p-8 hover:border-primary/40"
                  }
                `}
              >
                {/* Featured badge */}
                {plan.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/30">
                    <Crown className="h-3.5 w-3.5" />
                    {t("landing.bestValue")}
                  </div>
                )}

                {/* Plan label */}
                <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${plan.featured ? "text-primary" : "text-muted-foreground"}`}>
                  {plan.label}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-heading font-extrabold ${plan.featured ? "text-5xl" : "text-4xl"} text-foreground transition-transform duration-300 group-hover:scale-105`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                {/* Per day */}
                <p className="mt-2 text-xs text-muted-foreground">{plan.perDay}</p>

                {/* Divider */}
                <div className={`my-6 h-px ${plan.featured ? "bg-primary/20" : "bg-border/50"}`} />

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {included.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm">
                      <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.featured ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-foreground/80">{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/register" className="block">
                  <Button
                    size="lg"
                    className={`w-full font-heading font-semibold text-sm h-12 transition-all duration-300
                      ${plan.featured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25"
                        : "bg-muted text-foreground hover:bg-primary hover:text-primary-foreground"
                      }
                    `}
                  >
                    {t("landing.cta")}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border/50 bg-card/30 py-20">
        <div className="container">
          <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">{t("landing.featuresTitle")}</h2>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-4 transition-all duration-300 hover:border-primary/30 hover:translate-y-[-2px]">
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
          <div className="flex justify-center mb-3">
            <Logo />
          </div>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">{t("footer.credits")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
