-- Insert an achievement for all players
-- Replace ACHIEVEMENT_NUMBER with the actual achievement ID you want to grant

INSERT INTO achievements (player_id, achievement_id, progress, seen, date_unlocked)
SELECT 
  id AS player_id,
  ACHIEVEMENT_NUMBER AS achievement_id,  -- Replace ACHIEVEMENT_NUMBER with the actual achievement ID
  0 AS progress,
  false AS seen,
  now() AS date_unlocked
FROM players
ON CONFLICT (player_id, achievement_id) DO NOTHING;

-- Example: To grant achievement 1007 to all players:
-- INSERT INTO achievements (player_id, achievement_id, progress, seen, date_unlocked)
-- SELECT 
--   id AS player_id,
--   1007 AS achievement_id,
--   0 AS progress,
--   false AS seen,
--   now() AS date_unlocked
-- FROM players
-- ON CONFLICT (player_id, achievement_id) DO NOTHING;

