CREATE TABLE IF NOT EXISTS progress_photo (
    id BIGSERIAL PRIMARY KEY,
    captured_at TIMESTAMP NOT NULL,
    image_data_url TEXT NOT NULL,
    note VARCHAR(400),
    reminder_date DATE,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_progress_photo_user_captured_at
    ON progress_photo (user_id, captured_at DESC);
