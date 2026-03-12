
CREATE TABLE public.team_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_number TEXT NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_notes ENABLE ROW LEVEL SECURITY;

-- Team members can view notes for their team
CREATE POLICY "Team members can view team notes"
ON public.team_notes
FOR SELECT
TO authenticated
USING (
  team_number IN (
    SELECT tm.team_number FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.status = 'approved'
  )
);

-- Team members can create notes for their team
CREATE POLICY "Team members can create team notes"
ON public.team_notes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  team_number IN (
    SELECT tm.team_number FROM team_members tm
    WHERE tm.user_id = auth.uid() AND tm.status = 'approved'
  )
);

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
ON public.team_notes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own notes
CREATE POLICY "Users can delete own notes"
ON public.team_notes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
