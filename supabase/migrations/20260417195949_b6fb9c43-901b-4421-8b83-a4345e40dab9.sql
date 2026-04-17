-- Tabla de rutinas mensuales generadas
CREATE TABLE public.rutinas_fit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  objetivo TEXT,
  dias_semana INTEGER DEFAULT 3,
  duracion_dias INTEGER DEFAULT 28,
  equipamiento TEXT[] DEFAULT '{}',
  nivel TEXT,
  plan_json JSONB,
  notas TEXT,
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.rutinas_fit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own routines" ON public.rutinas_fit FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users insert own routines" ON public.rutinas_fit FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users update own routines" ON public.rutinas_fit FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Users delete own routines" ON public.rutinas_fit FOR DELETE USING (auth.uid() = usuario_id);
CREATE POLICY "Admins view all routines" ON public.rutinas_fit FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabla de sesiones de entrenamiento registradas
CREATE TABLE public.sesiones_entrenamiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rutina_id UUID REFERENCES public.rutinas_fit(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT,
  duracion_min INTEGER,
  kcal INTEGER,
  distancia_km NUMERIC,
  dispositivo TEXT,
  foto_url TEXT,
  datos_ia JSONB,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sesiones_entrenamiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.sesiones_entrenamiento FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users insert own sessions" ON public.sesiones_entrenamiento FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users update own sessions" ON public.sesiones_entrenamiento FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Users delete own sessions" ON public.sesiones_entrenamiento FOR DELETE USING (auth.uid() = usuario_id);
CREATE POLICY "Admins view all sessions" ON public.sesiones_entrenamiento FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_sesiones_usuario_fecha ON public.sesiones_entrenamiento(usuario_id, fecha DESC);

-- Tabla de fotos de progreso corporal
CREATE TABLE public.fotos_progreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL DEFAULT 'progreso',
  foto_url TEXT NOT NULL,
  peso_kg NUMERIC,
  cintura_cm NUMERIC,
  notas TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fotos_progreso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress" ON public.fotos_progreso FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users insert own progress" ON public.fotos_progreso FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "Users update own progress" ON public.fotos_progreso FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "Users delete own progress" ON public.fotos_progreso FOR DELETE USING (auth.uid() = usuario_id);
CREATE POLICY "Admins view all progress" ON public.fotos_progreso FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_fotos_usuario_fecha ON public.fotos_progreso(usuario_id, fecha DESC);

-- Bucket privado para fotos de fit
INSERT INTO storage.buckets (id, name, public) VALUES ('fit-uploads', 'fit-uploads', false);

CREATE POLICY "Users view own fit files"
ON storage.objects FOR SELECT
USING (bucket_id = 'fit-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own fit files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fit-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own fit files"
ON storage.objects FOR DELETE
USING (bucket_id = 'fit-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);