-- Optional v1 scene extension. The runtime also normalizes older JSON on read, so deployments
-- without automatic migrations remain compatible. json_insert preserves existing interaction data.
UPDATE npc_scene_states
SET state_json = json_insert(state_json, '$.interaction',
  json('{"romancePaused":false,"conversationPaused":false,"lastScope":"none","pendingOffer":null}'))
WHERE CASE WHEN json_valid(state_json) THEN json_type(state_json, '$.interaction') IS NULL ELSE 0 END;
