
-- Team members table for multi-user team accounts
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (team_number, user_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policies: users can see members of their own team
CREATE POLICY "Users can view team members for their team"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    team_number IN (
      SELECT tm.team_number FROM public.team_members tm WHERE tm.user_id = auth.uid() AND tm.status = 'approved'
    )
    OR user_id = auth.uid()
  );

-- Users can insert their own join requests
CREATE POLICY "Users can request to join teams"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Approved members can update (approve/reject) pending requests for their team
CREATE POLICY "Team members can manage join requests"
  ON public.team_members FOR UPDATE TO authenticated
  USING (
    team_number IN (
      SELECT tm.team_number FROM public.team_members tm WHERE tm.user_id = auth.uid() AND tm.status = 'approved'
    )
  );

-- Users can delete their own membership
CREATE POLICY "Users can leave teams"
  ON public.team_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Make profiles.team_number nullable for users without teams
ALTER TABLE public.profiles ALTER COLUMN team_number DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN team_number SET DEFAULT NULL;
