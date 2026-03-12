
-- Add pinned and category to team_notes
ALTER TABLE public.team_notes ADD COLUMN pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.team_notes ADD COLUMN category text DEFAULT null;

-- Saved predictions table
CREATE TABLE public.saved_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  red_team_1 text NOT NULL,
  red_team_2 text,
  blue_team_1 text NOT NULL,
  blue_team_2 text,
  win_prob_red integer NOT NULL DEFAULT 50,
  season text NOT NULL DEFAULT 'current',
  label text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own predictions" ON public.saved_predictions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
