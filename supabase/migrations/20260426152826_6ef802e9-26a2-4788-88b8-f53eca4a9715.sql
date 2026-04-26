-- Personal pins for any view in the app (events, teams, predictions, custom routes, etc.)
CREATE TABLE public.user_pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  -- e.g. 'event' | 'team' | 'view'
  kind TEXT NOT NULL,
  -- Stable identifier for dedupe (e.g. event id, team number, route+filters hash)
  ref TEXT NOT NULL,
  -- Display label shown in UI
  label TEXT NOT NULL,
  -- Optional secondary line (e.g. event date, team region)
  sublabel TEXT,
  -- Route to navigate to when clicked (always relative, e.g. /event/12345)
  route TEXT NOT NULL,
  -- Optional iconography hint (lucide icon name) — clients fall back gracefully
  icon TEXT,
  -- Manual ordering for drag-reorder later
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref)
);

CREATE INDEX idx_user_pins_user ON public.user_pins(user_id, position);

ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own pins"
ON public.user_pins
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable realtime so pins update across tabs/devices
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_pins;