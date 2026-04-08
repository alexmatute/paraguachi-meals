-- Fix token_usage insert policy
DROP POLICY IF EXISTS "Service can insert token usage" ON public.token_usage;
CREATE POLICY "Authenticated can insert token usage" ON public.token_usage
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Fix sesiones insert policy
DROP POLICY IF EXISTS "Service can insert sessions" ON public.sesiones;
CREATE POLICY "Authenticated can insert sessions" ON public.sesiones
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);
