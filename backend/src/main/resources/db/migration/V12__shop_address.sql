-- Human-readable shop address is separate from the routing coordinate.
-- Existing coordinates, assignments and dispatch state are deliberately untouched.
ALTER TABLE public.rescue_teams
  ADD COLUMN base_address TEXT CHECK (base_address IS NULL OR char_length(btrim(base_address)) BETWEEN 5 AND 300);
COMMENT ON COLUMN public.rescue_teams.base_address IS
  'Operator-confirmed display address. OSRM continues using base_latitude/base_longitude; editing the text never geocodes or moves the pin automatically.';
NOTIFY pgrst, 'reload schema';
