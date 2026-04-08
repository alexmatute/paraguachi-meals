
-- Create branding storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Create site_settings table for dynamic config like logo URL
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings" ON public.site_settings
  FOR SELECT TO public USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" ON public.site_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage policies for branding bucket
CREATE POLICY "Anyone can view branding files" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update branding files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete branding files" ON storage.objects
  FOR DELETE USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
