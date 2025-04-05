import { elizaLogger } from '@elizaos/core';
import { tweetQueries } from '../../../../extensions/src/db/queries.js';
import { KaitoService } from '../../../lib/services/kaito-service.js';

const kaitoService = new KaitoService();

export async function updateYapsData(
  accounts: Array<{ userId: string; username: string }>,
): Promise<void> {
  elizaLogger.info('[Yaps Processing] Updating Yaps data for target accounts');

  try {
    const yapsData = await kaitoService.getYapsForAccounts(accounts);

    for (const [username, yaps] of yapsData.entries()) {
      await tweetQueries.upsertYapsData({
        userId: yaps.user_id,
        username: yaps.username,
        yapsAll: yaps.yaps_all,
        yapsL24h: yaps.yaps_l24h,
        yapsL48h: yaps.yaps_l48h,
        yapsL7d: yaps.yaps_l7d,
        yapsL30d: yaps.yaps_l30d,
        yapsL3m: yaps.yaps_l3m,
        yapsL6m: yaps.yaps_l6m,
        yapsL12m: yaps.yaps_l12m,
        lastUpdated: new Date(),
      });

      elizaLogger.debug(`[Yaps Processing] Updated Yaps data for ${username}`, {
        yapsAll: yaps.yaps_all,
        yapsL30d: yaps.yaps_l30d,
      });
    }
  } catch (error) {
    elizaLogger.error('[Yaps Processing] Error updating Yaps data:', error);
  }
}
