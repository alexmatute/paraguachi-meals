
-- Add recetas_ids to planes
ALTER TABLE public.planes ADD COLUMN IF NOT EXISTS recetas_ids text[] DEFAULT '{}';
ALTER TABLE public.planes ADD COLUMN IF NOT EXISTS public_token text UNIQUE;
ALTER TABLE public.planes ADD COLUMN IF NOT EXISTS dias_generados integer DEFAULT 28;

-- Recipe catalog for anti-repetition
CREATE TABLE public.recetas_catalogo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  ingredientes_principales TEXT[] DEFAULT '{}',
  tipo_proteina TEXT,
  objetivo TEXT,
  hash TEXT UNIQUE,
  veces_generada INT DEFAULT 1,
  ultima_vez TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recetas_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipes" ON public.recetas_catalogo FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users can insert own recipes" ON public.recetas_catalogo FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users can update own recipes" ON public.recetas_catalogo FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Admins can view all recipes" ON public.recetas_catalogo FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
