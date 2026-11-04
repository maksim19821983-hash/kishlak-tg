-- состояние синхронизации по пользователю Telegram
CREATE TABLE IF NOT EXISTS sync_state (
  user_id    TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- события для статистики: минимум полей, без личных данных
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_hash  TEXT NOT NULL,
  name       TEXT NOT NULL,
  track_id   TEXT,
  release_id TEXT,
  day        TEXT NOT NULL,
  ts         INTEGER NOT NULL,
  session    TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_day ON events(day);
CREATE INDEX IF NOT EXISTS idx_events_name_day ON events(name, day);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_hash);
