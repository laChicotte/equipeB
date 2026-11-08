ALTER TABLE mentor_profile
 ADD COLUMN availability_timezone text NOT NULL DEFAULT 'Africa/Conakry' CHECK(length(availability_timezone) BETWEEN 1 AND 80),
 ADD COLUMN weekly_slots jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(weekly_slots)='array' AND jsonb_array_length(weekly_slots)<=21);
