-- Allow authenticated users to read cache, and service role to write
CREATE POLICY "Anyone can read cache" ON public.api_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage cache" ON public.api_cache FOR ALL TO service_role USING (true) WITH CHECK (true);