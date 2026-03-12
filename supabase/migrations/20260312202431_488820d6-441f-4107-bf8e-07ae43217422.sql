
-- Create a security definer function to check team membership without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_team_numbers(_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_number FROM public.team_members WHERE user_id = _user_id AND status = 'approved';
$$;

-- Create a security definer function to check if user is admin/owner of a team
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id uuid, _team_number text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id
      AND team_number = _team_number
      AND role IN ('admin', 'owner')
      AND status = 'approved'
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view team members for their team" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Members can update own membership" ON public.team_members;

-- Recreate SELECT policy using security definer function (no recursion)
CREATE POLICY "Users can view team members for their team"
ON public.team_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR team_number IN (SELECT public.get_user_team_numbers(auth.uid()))
);

-- Recreate admin UPDATE policy using security definer function
CREATE POLICY "Admins can manage team members"
ON public.team_members FOR UPDATE TO authenticated
USING (public.is_team_admin(auth.uid(), team_number));

-- Recreate self-update policy
CREATE POLICY "Members can update own membership"
ON public.team_members FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
