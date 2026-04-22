ALTER TABLE users
  ADD COLUMN failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN lockout_until DATETIME NULL,
  ADD COLUMN last_login_at DATETIME NULL;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scope_key VARCHAR(191) NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME NOT NULL,
  blocked_until DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_rate_limits_scope_key (scope_key),
  KEY idx_auth_rate_limits_blocked_until (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
