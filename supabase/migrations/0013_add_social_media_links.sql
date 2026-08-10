-- ============================================
-- 0013: Social media links tambahan di profil alumni
-- Menambah kolom Instagram, GitHub, Facebook, dan X (Twitter)
-- ============================================
ALTER TABLE alumni
  ADD COLUMN instagram TEXT,
  ADD COLUMN github TEXT,
  ADD COLUMN facebook TEXT,
  ADD COLUMN twitter TEXT;
