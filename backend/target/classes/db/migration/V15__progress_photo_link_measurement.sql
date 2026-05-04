ALTER TABLE progress_photo
    ADD COLUMN IF NOT EXISTS body_measurement_id BIGINT REFERENCES body_measurement(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_progress_photo_body_measurement ON progress_photo (body_measurement_id);
