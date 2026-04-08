-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  nombre TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  suscripcion_activa BOOLEAN DEFAULT FALSE,
  suscripcion_hasta TIMESTAMP WITH TIME ZONE,
  telegram_id BIGINT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'nombre');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create preferencias table
CREATE TABLE public.preferencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  personas INT DEFAULT 2,
  comidas TEXT[] DEFAULT '{}',
  objetivo TEXT,
  restricciones TEXT[] DEFAULT '{}',
  tiempo_cocina TEXT,
  nivel_culinario TEXT,
  equipamiento TEXT[] DEFAULT '{}',
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.preferencias FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users can insert their own preferences" ON public.preferencias FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users can update their own preferences" ON public.preferencias FOR UPDATE USING (auth.uid() = usuario_id);

-- Create planes table
CREATE TABLE public.planes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ingredientes TEXT,
  plan_json JSONB,
  plan_html TEXT,
  semanas INT DEFAULT 4,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plans" ON public.planes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own plans" ON public.planes FOR INSERT WITH CHECK (auth.uid() = usuario_id);
