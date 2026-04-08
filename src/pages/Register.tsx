import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error("Error al registrarse: " + error.message);
    } else {
      toast.success("¡Cuenta creada! Redirigiendo...");
      navigate("/checkout");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-primary" />
            <span className="font-heading text-xl font-bold text-primary">Paraguachi</span>
          </Link>
          <h1 className="mt-6 font-heading text-2xl font-bold">Crear cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Comienza tu plan de comidas</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 bg-card border-border" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 bg-card border-border" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="mt-1 bg-card border-border" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground font-semibold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
