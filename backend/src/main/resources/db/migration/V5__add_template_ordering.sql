ALTER TABLE template_exercise
    ADD COLUMN IF NOT EXISTS position INTEGER;

ALTER TABLE template_sets
    ADD COLUMN IF NOT EXISTS position INTEGER;

WITH ordered_exercises AS (
    SELECT id, template_id, ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY id) - 1 AS pos
    FROM template_exercise
)
UPDATE template_exercise te
SET position = oe.pos
FROM ordered_exercises oe
WHERE te.id = oe.id
  AND te.position IS NULL;

WITH ordered_sets AS (
    SELECT id, template_exercise_id, ROW_NUMBER() OVER (PARTITION BY template_exercise_id ORDER BY id) - 1 AS pos
    FROM template_sets
)
UPDATE template_sets ts
SET position = os.pos
FROM ordered_sets os
WHERE ts.id = os.id
  AND ts.position IS NULL;
