
-- Allow team admins/owners to delete (kick) team members
CREATE POLICY "Admins can remove team members"
ON public.team_members FOR DELETE TO authenticated
USING (public.is_team_admin(auth.uid(), team_number));
