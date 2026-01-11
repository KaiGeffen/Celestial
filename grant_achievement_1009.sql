INSERT INTO achievements (player_id, achievement_id, progress, seen, date_unlocked)
SELECT id, 1009, 0, false, now()
FROM players
WHERE LOWER(username) IN (
  LOWER('Hyugan'),
  LOWER('trynet'),
  LOWER('Deoxy'),
  LOWER('dnsosebee'),
  LOWER('Verv'),
  LOWER('Sherlock'),
  LOWER('rookiebob')
)
ON CONFLICT (player_id, achievement_id) DO NOTHING;

