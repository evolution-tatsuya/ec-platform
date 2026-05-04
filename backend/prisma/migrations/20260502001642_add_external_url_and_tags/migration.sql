-- AddExternalUrlAndTags
ALTER TABLE products ADD COLUMN external_url TEXT;
ALTER TABLE products ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
