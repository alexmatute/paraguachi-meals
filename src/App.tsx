import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { RequireAuth, RequireSubscription, RequireAdmin } from "@/components/RouteGuards";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Checkout from "./pages/Checkout";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import PlanViewer from "./pages/PlanViewer";
import Profile from "./pages/Profile";
import Fit from "./pages/Fit";
import PublicPlanViewer from "./pages/PublicPlanViewer";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminRecipes from "./pages/admin/AdminRecipes";
import AdminAI from "./pages/admin/AdminAI";
import AdminConnections from "./pages/admin/AdminConnections";
import AdminBranding from "./pages/admin/AdminBranding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/ver-plan/:token" element={<PublicPlanViewer />} />

            {/* Auth required (no subscription needed for checkout) */}
            <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
            <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />

            {/* Subscription required */}
            <Route path="/onboarding" element={<RequireSubscription><Onboarding /></RequireSubscription>} />
            <Route path="/dashboard" element={<RequireSubscription><Dashboard /></RequireSubscription>} />
            <Route path="/plan/:id" element={<RequireSubscription><PlanViewer /></RequireSubscription>} />
            <Route path="/fit" element={<RequireSubscription><Fit /></RequireSubscription>} />

            {/* Admin */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="suscripciones" element={<AdminSubscriptions />} />
              <Route path="recetas" element={<AdminRecipes />} />
              <Route path="ia" element={<AdminAI />} />
              <Route path="conexiones" element={<AdminConnections />} />
              <Route path="marca" element={<AdminBranding />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
