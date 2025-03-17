import { elizaLogger } from '@elizaos/core';
import { db } from '../db';

export async function updateAgentSetting(
  agentId: string,
  key: string,
  value: string,
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO agent_settings (agent_id, setting_key, setting_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (agent_id, setting_key) 
             DO UPDATE SET setting_value = $3, updated_at = CURRENT_TIMESTAMP`,
      [agentId, key, value],
    );
    elizaLogger.info(`Updated ${key} setting for agent ${agentId} to ${value}`);
  } catch (error) {
    elizaLogger.error(`Error updating agent setting ${key}:`, error);
    throw error;
  }
}

export async function getAgentSetting(
  agentId: string,
  key: string,
  defaultValue?: string,
): Promise<string | undefined> {
  try {
    const result = await db.query(
      `SELECT setting_value FROM agent_settings 
             WHERE agent_id = $1 AND setting_key = $2`,
      [agentId, key],
    );
    return result.rows.length > 0 ? result.rows[0].setting_value : defaultValue;
  } catch (error) {
    elizaLogger.error(`Error getting agent setting ${key}:`, error);
    throw error;
  }
}
