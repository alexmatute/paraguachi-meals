import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "es" | "en";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function detectLanguage(): Lang {
  const stored = localStorage.getItem("lang");
  if (stored === "es" || stored === "en") return stored;
  const nav = navigator.language?.toLowerCase() || "";
  return nav.startsWith("es") ? "es" : "en";
}

const translations: Record<Lang, Record<string, string>> = {
  es: {
    // Nav & Common
    "nav.login": "Iniciar sesión",
    "nav.logout": "Salir",
    "common.next": "Siguiente →",
    "common.prev": "← Anterior",
    "common.save": "Guardar cambios",
    "common.saving": "Guardando...",
    "common.loading": "Cargando...",
    "common.none": "Ninguna",
    "common.active": "Activa",
    "common.inactive": "Inactiva",
    "common.cancel": "Cancelar",
    "common.share": "Compartir",
    "common.download": "Descargar",
    "common.viewPlan": "Ver plan completo →",

    // Landing
    "landing.hero": "Tu chef personal crea hasta",
    "landing.heroHighlight": "28 recetas",
    "landing.heroEnd": "listas para cocinar en minutos.",
    "landing.sub": "¿Qué cocino hoy? Ya no más esa pregunta. Paraguachi Meals Prep — fácil, rápido y delicioso.",
    "landing.pricing": "Suscripción mensual",
    "landing.priceMonth": "/mes",
    "landing.cancelAnytime": "Cancela cuando quieras",
    "landing.cta": "Comenzar mi plan ahora →",
    "landing.featuresTitle": "Todo lo que necesitas para comer mejor",
    "landing.f1": "Plan de 28 días personalizado con tus ingredientes",
    "landing.f2": "Foto de recibo → menú completo en segundos",
    "landing.f3": "Recetas paso a paso para principiantes",
    "landing.f4": "Lista de compras semanal automática",
    "landing.f5": "Macros y nutrición calculados por receta",
    "landing.f6": "Guía de meal prep + consejos de almacenamiento",
    "landing.f7": "Soporte para dietas especiales y alergias",
    "landing.f8": "En español e inglés",

    // Login
    "login.title": "Iniciar sesión",
    "login.subtitle": "Ingresa a tu cuenta",
    "login.email": "Email",
    "login.password": "Contraseña",
    "login.button": "Iniciar sesión",
    "login.noAccount": "¿No tienes cuenta?",
    "login.register": "Regístrate",
    "login.error": "Error al iniciar sesión: ",

    // Register
    "register.title": "Crear cuenta",
    "register.subtitle": "Comienza tu plan de comidas",
    "register.name": "Nombre",
    "register.button": "Crear cuenta",
    "register.hasAccount": "¿Ya tienes cuenta?",
    "register.login": "Inicia sesión",
    "register.success": "¡Cuenta creada! Redirigiendo...",
    "register.error": "Error al registrarse: ",

    // Checkout
    "checkout.title": "Activar suscripción",
    "checkout.plan": "Plan mensual — $35/mes",
    "checkout.stripe": "Checkout con Stripe",
    "checkout.soon": "La integración de pagos se activará próximamente.",
    "checkout.continue": "Continuar al onboarding →",

    // Onboarding
    "onboarding.title": "Personaliza tu plan",
    "onboarding.step": "Paso",
    "onboarding.of": "de",
    "onboarding.step1.title": "¿Cómo quieres ingresar tus ingredientes?",
    "onboarding.step1.receipt": "Foto del Recibo",
    "onboarding.step1.fridge": "Foto de Nevera",
    "onboarding.step1.manual": "Lista Manual",
    "onboarding.step1.help": "Ayúdame a Comprar",
    "onboarding.step1.upload": "Sube tu foto aquí",
    "onboarding.step1.placeholder": "Escribe tus ingredientes, uno por línea...",
    "onboarding.step2.title": "Selecciona tus alimentos",
    "onboarding.step2.animalProteins": "🥩 Proteínas Animales",
    "onboarding.step2.plantProteins": "🌱 Proteínas Vegetales",
    "onboarding.step2.dairy": "🧀 Lácteos",
    "onboarding.step2.grains": "🌾 Granos",
    "onboarding.step2.veggies": "🥬 Vegetales",
    "onboarding.step2.fruits": "🍎 Frutas",
    "onboarding.step2.spices": "🧂 Condimentos",
    "onboarding.step3.title": "¿Para cuántas personas?",
    "onboarding.step3.meals": "Comidas del día",
    "onboarding.step4.title": "¿Cuál es tu objetivo?",
    "onboarding.step5.title": "Restricciones y preferencias",
    "onboarding.step5.allergies": "Alergias",
    "onboarding.step5.diets": "Dietas",
    "onboarding.step5.health": "Salud",
    "onboarding.step5.prefs": "Preferencias",
    "onboarding.step6.title": "Tu cocina",
    "onboarding.step6.time": "Tiempo de cocina",
    "onboarding.step6.level": "Nivel culinario",
    "onboarding.step6.equipment": "Equipamiento",
    "onboarding.step7.title": "¿Cuántas comidas quieres preparar?",
    "onboarding.step7.auto": "Auto (máximo)",
    "onboarding.step7.days": "días",
    "onboarding.step7.based": "Basado en tus ingredientes, podemos generar aproximadamente:",
    "onboarding.step7.upTo": "🍽️ Hasta",
    "onboarding.step7.uniqueRecipes": "recetas únicas",
    "onboarding.step8.title": "Resumen",
    "onboarding.step8.people": "Personas",
    "onboarding.step8.meals": "Comidas",
    "onboarding.step8.goal": "Objetivo",
    "onboarding.step8.restrictions": "Restricciones",
    "onboarding.step8.time": "Tiempo",
    "onboarding.step8.level": "Nivel",
    "onboarding.step8.equipment": "Equipamiento",
    "onboarding.generate": "🚀 Generar mi plan de",
    "onboarding.generating": "Generando tu plan personalizado...",
    "onboarding.success": "¡Plan generado exitosamente!",
    "onboarding.error": "Error al generar el plan: ",
    "onboarding.loginRequired": "Debes iniciar sesión",

    // Dashboard
    "dashboard.hello": "Hola,",
    "dashboard.plans": "planes generados",
    "dashboard.recipes": "recetas únicas",
    "dashboard.memberSince": "Miembro desde",
    "dashboard.newPlan": "Nuevo plan",
    "dashboard.lastPlan": "Mi último plan",
    "dashboard.myPlans": "Mis planes",
    "dashboard.noPlans": "Sin planes aún",
    "dashboard.noPlansDesc": "Genera tu primer plan de comidas personalizado",
    "dashboard.start": "Comenzar →",
    "dashboard.planOf": "Plan de",
    "dashboard.daysUnit": "días",
    "dashboard.connectTelegram": "Conecta Telegram",
    "dashboard.telegramDesc": "Recibe tus planes y recordatorios por Telegram",
    "dashboard.telegramConnect": "Conectar",
    "dashboard.telegramConnected": "✅ Telegram conectado",
    "dashboard.suggestions": "Para tu próximo plan, considera agregar:",
    "dashboard.linkCopied": "Enlace copiado al portapapeles",
    "dashboard.htmlDownloaded": "HTML descargado",
    "dashboard.htmlError": "Error al exportar HTML",

    // Plan Viewer
    "plan.title": "Plan de comidas",
    "plan.notFound": "Plan no encontrado",
    "plan.backDashboard": "← Volver al dashboard",
    "plan.week": "Semana",
    "plan.day": "Día",
    "plan.viewSteps": "Ver pasos",
    "plan.shopping": "Lista de compras",
    "plan.mealPrep": "Guía de Meal Prep",
    "plan.ingredients": "Ingredientes detectados",
    "plan.generated": "Recetas generadas",
    "plan.warnings": "⚠️ Advertencias",
    "plan.suggestions": "💡 Sugerencias para más variedad",
    "plan.additionalRecipes": "recetas",

    // Public Plan
    "public.shared": "Plan compartido",
    "public.expired": "Plan no encontrado o expirado",
    "public.ctaTitle": "¿Quieres tu plan personalizado?",
    "public.ctaDesc": "Obtén 28 recetas adaptadas a tus ingredientes y preferencias",
    "public.ctaButton": "Comenzar mi plan ahora →",
    "public.wantMyPlan": "Crear mi plan personalizado →",
    "public.wantPlan": "Quiero mi plan →",

    // Profile
    "profile.title": "Mi Perfil",
    "profile.photo": "Foto y Nombre",
    "profile.fullName": "Nombre completo",
    "profile.phone": "Teléfono",
    "profile.personal": "Datos Personales",
    "profile.birthdate": "Fecha de nacimiento",
    "profile.city": "Ciudad",
    "profile.country": "País",
    "profile.weight": "Peso (kg)",
    "profile.height": "Altura (cm)",
    "profile.healthTitle": "Salud y Restricciones",
    "profile.dietRestrictions": "Restricciones alimenticias",
    "profile.healthProblems": "Problemas de salud",
    "profile.subscription": "Mi Suscripción",
    "profile.nextCharge": "Próximo cobro:",
    "profile.security": "Seguridad",
    "profile.changePassword": "Cambiar contraseña",
    "profile.passwordEmail": "Revisa tu email para cambiar la contraseña",
    "profile.telegram": "Telegram",
    "profile.connected": "Conectado",
    "profile.notConnected": "No conectado. Próximamente podrás vincular tu cuenta de Telegram.",
    "profile.saved": "Perfil actualizado",
    "profile.saveError": "Error al guardar",
    "profile.photoUpdated": "Foto actualizada",
    "profile.photoError": "Error al subir imagen",

    // Admin
    "admin.panel": "Panel de Administración",
    "admin.menu": "Menú",
    "admin.dashboard": "Dashboard",
    "admin.users": "Usuarios",
    "admin.subscriptions": "Suscripciones",
    "admin.recipes": "Recetas",
    "admin.aiUsage": "Uso de IA",
    "admin.connections": "Conexiones",
    "admin.exit": "Salir",

    // Footer
    "footer.credits": "Paraguachi Meals Prep · Ing. Chef Alexander Matute & Ing. Nelly Rendón, Especialista en Manipulación y Conservación de Alimentos · Los Angeles, CA",

    // Onboarding data labels
    "data.goal.sano": "Comer más sano",
    "data.goal.perder": "Perder grasa corporal",
    "data.goal.musculo": "Ganar músculo",
    "data.goal.mantener": "Mantener peso",
    "data.goal.familia": "Familia balanceada",
    "data.goal.rendimiento": "Alto rendimiento",
    "data.time.15": "15 min",
    "data.time.20-35": "20-35 min",
    "data.time.60": "Hasta 1 hora",
    "data.time.mealprep": "Meal Prep domingo",
    "data.skill.beginner": "Principiante",
    "data.skill.basic": "Básico",
    "data.skill.intermediate": "Intermedio",
    "data.skill.advanced": "Avanzado",
    "data.meal.breakfast": "Desayuno",
    "data.meal.midmorning": "Media Mañana",
    "data.meal.lunch": "Almuerzo",
    "data.meal.snack": "Merienda",
    "data.meal.dinner": "Cena",
    "data.meal.nightsnack": "Snack Nocturno",
  },
  en: {
    // Nav & Common
    "nav.login": "Sign in",
    "nav.logout": "Log out",
    "common.next": "Next →",
    "common.prev": "← Back",
    "common.save": "Save changes",
    "common.saving": "Saving...",
    "common.loading": "Loading...",
    "common.none": "None",
    "common.active": "Active",
    "common.inactive": "Inactive",
    "common.cancel": "Cancel",
    "common.share": "Share",
    "common.download": "Download",
    "common.viewPlan": "View full plan →",

    // Landing
    "landing.hero": "Your personal chef creates up to",
    "landing.heroHighlight": "28 recipes",
    "landing.heroEnd": "ready to cook in minutes.",
    "landing.sub": "What should I cook today? No more asking. Paraguachi Meals Prep — easy, fast, and delicious.",
    "landing.pricing": "Monthly subscription",
    "landing.priceMonth": "/month",
    "landing.cancelAnytime": "Cancel anytime",
    "landing.cta": "Start my plan now →",
    "landing.featuresTitle": "Everything you need to eat better",
    "landing.f1": "28-day plan customized with your ingredients",
    "landing.f2": "Receipt photo → full menu in seconds",
    "landing.f3": "Step-by-step recipes for beginners",
    "landing.f4": "Automatic weekly shopping list",
    "landing.f5": "Macros and nutrition calculated per recipe",
    "landing.f6": "Meal prep guide + storage tips",
    "landing.f7": "Support for special diets and allergies",
    "landing.f8": "In English and Spanish",

    // Login
    "login.title": "Sign in",
    "login.subtitle": "Access your account",
    "login.email": "Email",
    "login.password": "Password",
    "login.button": "Sign in",
    "login.noAccount": "Don't have an account?",
    "login.register": "Sign up",
    "login.error": "Login error: ",

    // Register
    "register.title": "Create account",
    "register.subtitle": "Start your meal plan",
    "register.name": "Name",
    "register.button": "Create account",
    "register.hasAccount": "Already have an account?",
    "register.login": "Sign in",
    "register.success": "Account created! Redirecting...",
    "register.error": "Registration error: ",

    // Checkout
    "checkout.title": "Activate subscription",
    "checkout.plan": "Monthly plan — $35/month",
    "checkout.stripe": "Checkout with Stripe",
    "checkout.soon": "Payment integration coming soon.",
    "checkout.continue": "Continue to onboarding →",

    // Onboarding
    "onboarding.title": "Customize your plan",
    "onboarding.step": "Step",
    "onboarding.of": "of",
    "onboarding.step1.title": "How do you want to enter your ingredients?",
    "onboarding.step1.receipt": "Receipt Photo",
    "onboarding.step1.fridge": "Fridge Photo",
    "onboarding.step1.manual": "Manual List",
    "onboarding.step1.help": "Help Me Shop",
    "onboarding.step1.upload": "Upload your photo here",
    "onboarding.step1.placeholder": "Type your ingredients, one per line...",
    "onboarding.step2.title": "Select your foods",
    "onboarding.step2.animalProteins": "🥩 Animal Proteins",
    "onboarding.step2.plantProteins": "🌱 Plant Proteins",
    "onboarding.step2.dairy": "🧀 Dairy",
    "onboarding.step2.grains": "🌾 Grains",
    "onboarding.step2.veggies": "🥬 Vegetables",
    "onboarding.step2.fruits": "🍎 Fruits",
    "onboarding.step2.spices": "🧂 Spices & Condiments",
    "onboarding.step3.title": "How many people?",
    "onboarding.step3.meals": "Meals of the day",
    "onboarding.step4.title": "What's your goal?",
    "onboarding.step5.title": "Restrictions & preferences",
    "onboarding.step5.allergies": "Allergies",
    "onboarding.step5.diets": "Diets",
    "onboarding.step5.health": "Health",
    "onboarding.step5.prefs": "Preferences",
    "onboarding.step6.title": "Your kitchen",
    "onboarding.step6.time": "Cooking time",
    "onboarding.step6.level": "Skill level",
    "onboarding.step6.equipment": "Equipment",
    "onboarding.step7.title": "How many meals do you want to prepare?",
    "onboarding.step7.auto": "Auto (maximum)",
    "onboarding.step7.days": "days",
    "onboarding.step7.based": "Based on your ingredients, we can generate approximately:",
    "onboarding.step7.upTo": "🍽️ Up to",
    "onboarding.step7.uniqueRecipes": "unique recipes",
    "onboarding.step8.title": "Summary",
    "onboarding.step8.people": "People",
    "onboarding.step8.meals": "Meals",
    "onboarding.step8.goal": "Goal",
    "onboarding.step8.restrictions": "Restrictions",
    "onboarding.step8.time": "Time",
    "onboarding.step8.level": "Level",
    "onboarding.step8.equipment": "Equipment",
    "onboarding.generate": "🚀 Generate my",
    "onboarding.generating": "Generating your custom plan...",
    "onboarding.success": "Plan generated successfully!",
    "onboarding.error": "Error generating plan: ",
    "onboarding.loginRequired": "You must be logged in",

    // Dashboard
    "dashboard.hello": "Hi,",
    "dashboard.plans": "plans generated",
    "dashboard.recipes": "unique recipes",
    "dashboard.memberSince": "Member since",
    "dashboard.newPlan": "New plan",
    "dashboard.lastPlan": "My last plan",
    "dashboard.myPlans": "My plans",
    "dashboard.noPlans": "No plans yet",
    "dashboard.noPlansDesc": "Generate your first personalized meal plan",
    "dashboard.start": "Get started →",
    "dashboard.planOf": "Plan of",
    "dashboard.daysUnit": "days",
    "dashboard.connectTelegram": "Connect Telegram",
    "dashboard.telegramDesc": "Receive your plans and reminders via Telegram",
    "dashboard.telegramConnect": "Connect",
    "dashboard.telegramConnected": "✅ Telegram connected",
    "dashboard.suggestions": "For your next plan, consider adding:",
    "dashboard.linkCopied": "Link copied to clipboard",
    "dashboard.htmlDownloaded": "HTML downloaded",
    "dashboard.htmlError": "Error exporting HTML",

    // Plan Viewer
    "plan.title": "Meal plan",
    "plan.notFound": "Plan not found",
    "plan.backDashboard": "← Back to dashboard",
    "plan.week": "Week",
    "plan.day": "Day",
    "plan.viewSteps": "View steps",
    "plan.shopping": "Shopping list",
    "plan.mealPrep": "Meal Prep Guide",
    "plan.ingredients": "Ingredients detected",
    "plan.generated": "Recipes generated",
    "plan.warnings": "⚠️ Warnings",
    "plan.suggestions": "💡 Suggestions for more variety",
    "plan.additionalRecipes": "recipes",

    // Public Plan
    "public.shared": "Shared plan",
    "public.expired": "Plan not found or expired",
    "public.ctaTitle": "Want your personalized plan?",
    "public.ctaDesc": "Get 28 recipes tailored to your ingredients and preferences",
    "public.ctaButton": "Start my plan now →",
    "public.wantMyPlan": "Create my personalized plan →",
    "public.wantPlan": "I want my plan →",

    // Profile
    "profile.title": "My Profile",
    "profile.photo": "Photo & Name",
    "profile.fullName": "Full name",
    "profile.phone": "Phone",
    "profile.personal": "Personal Data",
    "profile.birthdate": "Date of birth",
    "profile.city": "City",
    "profile.country": "Country",
    "profile.weight": "Weight (kg)",
    "profile.height": "Height (cm)",
    "profile.healthTitle": "Health & Restrictions",
    "profile.dietRestrictions": "Dietary restrictions",
    "profile.healthProblems": "Health conditions",
    "profile.subscription": "My Subscription",
    "profile.nextCharge": "Next charge:",
    "profile.security": "Security",
    "profile.changePassword": "Change password",
    "profile.passwordEmail": "Check your email to change your password",
    "profile.telegram": "Telegram",
    "profile.connected": "Connected",
    "profile.notConnected": "Not connected. Telegram linking coming soon.",
    "profile.saved": "Profile updated",
    "profile.saveError": "Error saving",
    "profile.photoUpdated": "Photo updated",
    "profile.photoError": "Error uploading image",

    // Admin
    "admin.panel": "Admin Panel",
    "admin.menu": "Menu",
    "admin.dashboard": "Dashboard",
    "admin.users": "Users",
    "admin.subscriptions": "Subscriptions",
    "admin.recipes": "Recipes",
    "admin.aiUsage": "AI Usage",
    "admin.connections": "Connections",
    "admin.exit": "Exit",

    // Footer
    "footer.credits": "Paraguachi Meals Prep · Chef Eng. Alexander Matute & Eng. Nelly Rendón, Food Handling & Preservation Specialist · Los Angeles, CA",

    // Onboarding data labels
    "data.goal.sano": "Eat healthier",
    "data.goal.perder": "Lose body fat",
    "data.goal.musculo": "Build muscle",
    "data.goal.mantener": "Maintain weight",
    "data.goal.familia": "Balanced family",
    "data.goal.rendimiento": "High performance",
    "data.time.15": "15 min",
    "data.time.20-35": "20-35 min",
    "data.time.60": "Up to 1 hour",
    "data.time.mealprep": "Sunday Meal Prep",
    "data.skill.beginner": "Beginner",
    "data.skill.basic": "Basic",
    "data.skill.intermediate": "Intermediate",
    "data.skill.advanced": "Advanced",
    "data.meal.breakfast": "Breakfast",
    "data.meal.midmorning": "Mid-Morning",
    "data.meal.lunch": "Lunch",
    "data.meal.snack": "Snack",
    "data.meal.dinner": "Dinner",
    "data.meal.nightsnack": "Night Snack",
  },
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLanguage);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, []);

  const t = (key: string): string => translations[lang][key] || translations.es[key] || key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
