ALTER TABLE workout
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

INSERT INTO app_users (username, password)
SELECT '__legacy_owner__', '$2a$10$MSEa5x2duzWIKf4A9JvV6OU76ovQw8K3VPe4fBYibM5QbbU1XMNxq'
WHERE NOT EXISTS (
    SELECT 1
    FROM app_users
    WHERE username = '__legacy_owner__'
);

UPDATE workout
SET user_id = (
    SELECT id
    FROM app_users
    WHERE username = '__legacy_owner__'
)
WHERE user_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_workout_user'
    ) THEN
        ALTER TABLE workout
            ADD CONSTRAINT fk_workout_user
            FOREIGN KEY (user_id) REFERENCES app_users (id);
    END IF;
END $$;

ALTER TABLE workout
    ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_user_id ON workout (user_id);
