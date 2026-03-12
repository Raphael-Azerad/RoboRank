
-- Allow team admins to view profiles of pending members (so they can see emails)
CREATE POLICY "Team admins can view pending member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tm.user_id
    FROM team_members tm
    WHERE tm.status = 'pending'
      AND public.is_team_admin(auth.uid(), tm.team_number)
  )
);
