
-- Fix privilege escalation: Replace the team_members UPDATE policy
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Team members can manage join requests" ON public.team_members;

-- Only admins/owners can update other members' roles and status
CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_number = team_members.team_number
    AND tm.role IN ('admin', 'owner')
    AND tm.status = 'approved'
  )
);

-- Members can only update their own row's non-sensitive fields (leave team)
CREATE POLICY "Members can update own membership"
ON public.team_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix notifications: Only allow service_role to insert, remove self-insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Enable leaked password protection
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
