-- Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto_perfil TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ciudad TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pais TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS problemas_salud TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS peso_kg DECIMAL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS altura_cm DECIMAL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultima_conexion TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dispositivo TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ip_pais TEXT;

-- Create user_roles table (roles in separate table for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'cliente',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-assign 'cliente' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Token usage table
CREATE TABLE public.token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.planes(id) ON DELETE SET NULL,
  tokens_input INT,
  tokens_output INT,
  tokens_total INT,
  costo_usd DECIMAL(10,6),
  modelo TEXT DEFAULT 'gemini-2.5-flash',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own token usage" ON public.token_usage
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Admins can view all token usage" ON public.token_usage
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert token usage" ON public.token_usage
  FOR INSERT WITH CHECK (true);

-- Sessions table
CREATE TABLE public.sesiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ip TEXT,
  pais TEXT,
  ciudad TEXT,
  dispositivo TEXT,
  navegador TEXT,
  inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fin TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.sesiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.sesiones
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Admins can view all sessions" ON public.sesiones
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert sessions" ON public.sesiones
  FOR INSERT WITH CHECK (true);

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin can view all plans
CREATE POLICY "Admins can view all plans" ON public.planes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all preferences
CREATE POLICY "Admins can view all preferences" ON public.preferencias
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
