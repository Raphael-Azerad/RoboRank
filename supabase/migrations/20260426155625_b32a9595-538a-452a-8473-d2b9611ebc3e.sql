-- Helper to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.scout_board_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_number TEXT NOT NULL,
  event_id INTEGER NOT NULL,
  event_name TEXT,
  watched_team TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'notes',
  rating SMALLINT,
  body TEXT NOT NULL DEFAULT '',
  author_id UUID NOT NULL,
  author_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT scout_board_rating_range CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5))
);

CREATE INDEX idx_scout_board_team_event ON public.scout_board_entries (team_number, event_id, created_at DESC);
CREATE INDEX idx_scout_board_watched ON public.scout_board_entries (team_number, event_id, watched_team);

ALTER TABLE public.scout_board_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teammates can view scout board"
ON public.scout_board_entries
FOR SELECT
TO authenticated
USING (team_number IN (SELECT public.get_user_team_numbers(auth.uid())));

CREATE POLICY "Teammates can add scout board entries"
ON public.scout_board_entries
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND team_number IN (SELECT public.get_user_team_numbers(auth.uid()))
);

CREATE POLICY "Authors update own scout entries"
ON public.scout_board_entries
FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors delete own scout entries"
ON public.scout_board_entries
FOR DELETE
TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "Team admins delete scout entries"
ON public.scout_board_entries
FOR DELETE
TO authenticated
USING (public.is_team_admin(auth.uid(), team_number));

CREATE TRIGGER trg_scout_board_updated_at
BEFORE UPDATE ON public.scout_board_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.scout_board_entries REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scout_board_entries;