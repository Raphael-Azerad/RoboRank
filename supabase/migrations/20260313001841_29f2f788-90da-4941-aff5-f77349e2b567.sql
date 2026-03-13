-- Ensure profile team assignments always create a team_members row
CREATE OR REPLACE FUNCTION public.sync_profile_team_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_team text;
BEGIN
  normalized_team := NULLIF(upper(trim(NEW.team_number)), '');

  IF normalized_team IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.team_members (team_number, user_id)
  VALUES (normalized_team, NEW.id)
  ON CONFLICT (team_number, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_team_membership_on_insert ON public.profiles;
CREATE TRIGGER sync_profile_team_membership_on_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_team_membership();

DROP TRIGGER IF EXISTS sync_profile_team_membership_on_team_change ON public.profiles;
CREATE TRIGGER sync_profile_team_membership_on_team_change
AFTER UPDATE OF team_number ON public.profiles
FOR EACH ROW
WHEN (NEW.team_number IS DISTINCT FROM OLD.team_number)
EXECUTE FUNCTION public.sync_profile_team_membership();

-- Backfill users who already have a profile team_number but no team_members row
INSERT INTO public.team_members (team_number, user_id)
SELECT upper(trim(p.team_number)), p.id
FROM public.profiles p
WHERE NULLIF(trim(p.team_number), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = p.id
  )
ON CONFLICT (team_number, user_id) DO NOTHING;