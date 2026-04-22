DROP TABLE IF EXISTS auth_rate_limits;

ALTER TABLE users
  DROP COLUMN last_login_at,
  DROP COLUMN lockout_until,
  DROP COLUMN failed_login_attempts;
