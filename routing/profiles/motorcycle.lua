-- Experimental solo-motorcycle profile for the Da Nang thesis prototype.
-- Based on OSRM v5.27.1's official car handlers, NOT a production-validated ETA model.
local profile_root = os.getenv('OSRM_PROFILES_DIR') or '/opt/osrm-backend/profiles'
package.path = profile_root .. '/?.lua;' .. package.path
local car = dofile(profile_root .. '/car.lua')
local Sequence = require('lib/sequence')
local Set = require('lib/set')

local allowed_highways = Set { 'trunk', 'trunk_link', 'primary', 'primary_link',
  'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified',
  'residential', 'living_street', 'service' }

local function setup()
  local profile = car.setup()
  profile.access_tags_hierarchy = Sequence { 'motorcycle', 'motor_vehicle', 'vehicle', 'access' }
  profile.restrictions = Sequence { 'motorcycle', 'motor_vehicle', 'vehicle' }
  profile.vehicle_height = 1.8
  profile.vehicle_width = 0.8
  profile.vehicle_length = 2.2
  profile.vehicle_weight = 300
  profile.access_tag_whitelist = Set { 'yes', 'permissive', 'designated' }
  -- Do not silently route through private/delivery-only streets in this prototype.
  profile.restricted_access_tag_list = Set {}
  return profile
end

local function process_way(profile, way, result, relations)
  local highway = way:get_value_by_key('highway')
  -- Conservative road whitelist. No motorways, paths, steps, pedestrian ways,
  -- ferries, or motorroad=yes segments, even if other tags look permissive.
  if not allowed_highways[highway] or way:get_value_by_key('motorroad') == 'yes' then return end
  car.process_way(profile, way, result, relations)
end

return { setup = setup, process_way = process_way,
  process_node = car.process_node, process_turn = car.process_turn }
