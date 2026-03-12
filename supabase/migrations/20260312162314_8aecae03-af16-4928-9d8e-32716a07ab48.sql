
-- Update handle_new_user to handle null team_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, team_number, email, team_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'team_number',
    NEW.email,
    NEW.raw_user_meta_data->>'team_name'
  );
  RETURN NEW;
END;
$function$;
