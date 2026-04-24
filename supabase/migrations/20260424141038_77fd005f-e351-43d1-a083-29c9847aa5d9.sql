CREATE TABLE public.alliance_watchlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_number text NOT NULL,
  watched_team text NOT NULL,
  event_id integer,
  event_name text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (team_number, watched_team, event_id)
);

ALTER TABLE public.alliance_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view watchlist"
ON public.alliance_watchlist FOR SELECT TO authenticated
USING (team_number IN (SELECT get_user_team_numbers(auth.uid())));

CREATE POLICY "Team members can add to watchlist"
ON public.alliance_watchlist FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND team_number IN (SELECT get_user_team_numbers(auth.uid())));

CREATE POLICY "Users can update own watchlist entries"
ON public.alliance_watchlist FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own watchlist entries"
ON public.alliance_watchlist FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE INDEX idx_alliance_watchlist_team ON public.alliance_watchlist(team_number);