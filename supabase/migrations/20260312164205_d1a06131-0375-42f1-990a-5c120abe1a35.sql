
-- Allow team members to view profiles of other team members
CREATE POLICY "Team members can view teammate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tm.user_id FROM public.team_members tm
    WHERE tm.team_number IN (
      SELECT tm2.team_number FROM public.team_members tm2
      WHERE tm2.user_id = auth.uid() AND tm2.status = 'approved'
    )
    AND tm.status = 'approved'
  )
);
