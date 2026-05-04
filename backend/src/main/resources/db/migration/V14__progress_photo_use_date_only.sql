ALTER TABLE progress_photo
    ALTER COLUMN captured_at TYPE DATE
    USING captured_at::date;
