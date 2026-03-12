INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their own logo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own logo" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'team-logos');

CREATE POLICY "Users can delete their own logo" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'team-logos' AND (storage.foldername(name))[1] = auth.uid()::text);