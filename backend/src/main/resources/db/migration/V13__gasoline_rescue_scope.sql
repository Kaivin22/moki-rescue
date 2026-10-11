-- Retire electric-motorcycle services without deleting catalog/history records.
-- Existing assigned cases remain readable and can be completed/cancelled normally.
UPDATE public.service_types SET is_active = FALSE WHERE code = 'electric_battery';
UPDATE public.team_capabilities SET is_active = FALSE WHERE service_code = 'electric_battery';

ALTER TABLE public.service_types ADD CONSTRAINT service_types_gasoline_scope
  CHECK (code <> 'electric_battery' OR NOT is_active);
ALTER TABLE public.team_capabilities ADD CONSTRAINT team_capabilities_gasoline_scope
  CHECK (service_code <> 'electric_battery' OR NOT is_active);

NOTIFY pgrst, 'reload schema';
