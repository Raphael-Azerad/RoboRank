CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, team_number, email, team_name, followed_team)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'team_number',
    NEW.email,
    NEW.raw_user_meta_data->>'team_name',
    NEW.raw_user_meta_data->>'followed_team'
  );
  RETURN NEW;
END;
$$;