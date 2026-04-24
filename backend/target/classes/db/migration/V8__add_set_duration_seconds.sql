ALTER TABLE exercise_sets
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE template_sets
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
