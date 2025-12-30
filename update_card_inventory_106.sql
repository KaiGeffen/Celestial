-- Update the 106th character of card_inventory to '1' for all players
-- This uses PostgreSQL string functions:
-- - LEFT() gets the first N characters
-- - SUBSTRING() gets characters from position N onwards (1-indexed)
-- - COALESCE handles cases where the string might be shorter than 106 characters

UPDATE players
SET card_inventory = 
  LEFT(card_inventory, 105) || 
  '1' || 
  COALESCE(SUBSTRING(card_inventory FROM 107), '')
WHERE LENGTH(card_inventory) >= 1;

-- Alternative version that pads the string if it's shorter than 106 characters:
-- UPDATE players
-- SET card_inventory = 
--   LEFT(card_inventory || REPEAT('0', 1000), 105) || 
--   '1' || 
--   COALESCE(SUBSTRING(card_inventory FROM 107), '')
-- WHERE LENGTH(card_inventory) >= 1;

