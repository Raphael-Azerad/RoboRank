-- Enforce deterministic team membership defaults and single-owner rule
CREATE OR REPLACE FUNCTION public.assign_team_membership_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_approved_member boolean;
BEGIN
  NEW.team_number := upper(trim(NEW.team_number));

  IF NEW.team_number IS NULL OR NEW.team_number = '' THEN
    RAISE EXCEPTION 'Team number is required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_number = NEW.team_number
      AND status = 'approved'
  )
  INTO has_approved_member;

  IF has_approved_member THEN
    NEW.role := 'member';
    NEW.status := 'pending';
  ELSE
    NEW.role := 'owner';
    NEW.status := 'approved';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_team_membership_defaults ON public.team_members;
CREATE TRIGGER set_team_membership_defaults
BEFORE INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.assign_team_membership_defaults();

-- Keep updated_at current for all membership updates
CREATE OR REPLACE FUNCTION public.touch_team_member_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_team_members_updated_at ON public.team_members;
CREATE TRIGGER touch_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.touch_team_member_updated_at();

-- Users should not be able to self-approve or self-promote
DROP POLICY IF EXISTS "Members can update own membership" ON public.team_members;

-- Enforce exactly one approved owner per team
CREATE UNIQUE INDEX IF NOT EXISTS team_members_one_owner_per_team_idx
ON public.team_members (team_number)
WHERE role = 'owner' AND status = 'approved';

ALTER TABLE public.team_members
DROP CONSTRAINT IF EXISTS team_members_owner_must_be_approved;

ALTER TABLE public.team_members
ADD CONSTRAINT team_members_owner_must_be_approved
CHECK (role <> 'owner' OR status = 'approved');