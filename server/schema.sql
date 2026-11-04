-- состояние синхронизации по пользователю Telegram
CREATE TABLE IF NOT EXISTS sync_state (
  user_id    TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
