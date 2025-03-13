import { elizaLogger } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { AgentPrompt } from '../db/schema';

export async function savePrompt(settings: AgentPrompt): Promise<AgentPrompt> {
  try {
    const prompt: AgentPrompt = {
      id: uuidv4(),
      prompt: settings.prompt,
      agentId: settings.agentId,
      version: settings.version,
      enabled: settings.enabled,
    };
    const { rows } = await db.query(
      'INSERT INTO agent_prompts (id, prompt, agent_id, version, enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        prompt.id,
        prompt.prompt,
        prompt.agentId,
        prompt.version,
        prompt.enabled ? 'true' : 'false',
      ],
    );
    return rows[0];
  } catch (error) {
    elizaLogger.error('Error saving prompt:', error);
    throw error;
  }
}

export async function getPrompt(agentId: string): Promise<AgentPrompt | null> {
  const { rows } = await db.query(
    'SELECT * FROM agent_prompts WHERE agent_id = $1 LIMIT 1',
    [agentId],
  );
  return rows[0] || null;
}

export async function updatePrompt(
  id: string,
  settings: Partial<AgentPrompt>,
): Promise<AgentPrompt> {
  try {
    const setClauses = [];
    const values = [id];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined) {
        if (key === 'enabled') {
          setClauses.push(`${key} = $${++paramCount}`);
          values.push(value ? 'true' : 'false');
        } else {
          setClauses.push(`${key} = $${++paramCount}`);
          values.push(String(value));
        }
      }
    }

    const { rows } = await db.query(
      `UPDATE agent_prompts SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values,
    );
    return rows[0];
  } catch (error) {
    elizaLogger.error('Error updating prompt:', error);
    throw error;
  }
}
