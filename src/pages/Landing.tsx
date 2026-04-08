import { Link } from "react-router-dom";
import { Check, ChefHat, Clock, Globe, Heart, Leaf, ListChecks, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Sparkles, text: "Plan de 28 días personalizado con tus ingredientes" },
  { icon: ShoppingCart, text: "Foto de recibo → menú completo en segundos" },
  { icon: ListChecks, text: "Recetas paso a paso para principiantes" },
  { icon: ShoppingCart, text: "Lista de compras semanal automática" },
  { icon: Heart, text: "Macros y nutrición calculados por receta" },
  { icon: Clock, text: "Guía de meal prep + consejos de almacenamiento" },
  { icon: Leaf, text: "Soporte para dietas especiales y alergias" },
  { icon: Globe, text: "En español e inglés" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="font-heading text-xl font-bold text-primary">Paraguachi Meals Prep</span>
          </div>
          <Link to="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl animate-fade-in-up">
            Tu chef personal crea hasta{" "}
            <span className="text-gradient-primary">28 recetas</span>{" "}
            listas para cocinar en minutos.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            ¿Qué cocino hoy? Ya no más esa pregunta. Paraguachi Meals Prep — fácil, rápido y delicioso.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mx-auto mt-16 max-w-md animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <div className="card-surface p-8 text-center glow-primary">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Suscripción mensual</p>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="font-heading text-5xl font-extrabold text-foreground">$35</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Cancela cuando quieras</p>
            <Link to="/register" className="block mt-8">
              <Button size="lg" className="w-full bg-primary text-primary-foreground font-heading font-semibold text-base hover:bg-primary/90 h-12">
                Comenzar mi plan ahora →
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 bg-card/30 py-20">
        <div className="container">
          <h2 className="text-center font-heading text-2xl font-bold md:text-3xl">
            Todo lo que necesitas para comer mejor
          </h2>
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

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ChefHat className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-bold text-primary">Paraguachi Meals Prep</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Paraguachi Meals Prep · Ing. Chef Alexander Matute & Ing. Nelly Rendón, Especialista en Manipulación y Conservación de Alimentos · Los Angeles, CA
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
