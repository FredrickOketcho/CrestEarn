ALTER TABLE chat_messages
  ADD COLUMN read_at timestamptz;

CREATE INDEX chat_messages_unread_by_sender_idx
  ON chat_messages(user_id, sender, read_at)
  WHERE read_at IS NULL;
