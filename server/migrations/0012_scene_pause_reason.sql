-- Add evidence provenance without clearing existing pauses. Runtime normalizes the same field
-- and reconciles legacy pauses only when actual player history identifies the cause.
UPDATE npc_scene_states
SET state_json = json_insert(state_json, '$.interaction.romancePauseReason',
  CASE WHEN json_extract(state_json, '$.interaction.romancePaused') = 1 THEN 'legacy' ELSE 'none' END)
WHERE CASE WHEN json_valid(state_json) THEN
  json_type(state_json, '$.interaction') = 'object'
  AND json_type(state_json, '$.interaction.romancePauseReason') IS NULL ELSE 0 END;
