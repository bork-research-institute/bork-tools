import { elizaLogger } from '@elizaos/core';
import { Pool } from 'pg';

export async function getConnection() {
  return new Pool({ connectionString: process.env.POSTGRES_URL });
}

export async function updateAgentSetting(
  agentId: string,
  key: string,
  value: string,
): Promise<void> {
  const pool = await getConnection();
  try {
    await pool.query(
      `INSERT INTO agent_settings (agent_id, setting_key, setting_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (agent_id, setting_key) 
             DO UPDATE SET setting_value = $3, updated_at = CURRENT_TIMESTAMP`,
      [agentId, key, value],
    );
    elizaLogger.info(`Updated ${key} setting for agent ${agentId} to ${value}`);
  } finally {
    pool.end();
  }
}

export async function getAgentSetting(
  agentId: string,
  key: string,
  defaultValue?: string,
): Promise<string | undefined> {
  const pool = await getConnection();
  try {
    const result = await pool.query(
      `SELECT setting_value FROM agent_settings 
             WHERE agent_id = $1 AND setting_key = $2`,
      [agentId, key],
    );
    return result.rows.length > 0 ? result.rows[0].setting_value : defaultValue;
  } finally {
    pool.end();
  }
}
