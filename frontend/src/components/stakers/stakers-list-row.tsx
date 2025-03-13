import { formatDistanceToNow } from 'date-fns';
import { ChefHat } from 'lucide-react';
import type { StakerData } from '../../lib/services/database/get-stakers-from-db';
import { trimAddress } from '../../lib/utils/trim-address';
import { TableCell, TableRow } from '../ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface StakersListRowProps {
  staker: StakerData;
}

export function StakersListRow({ staker }: StakersListRowProps) {
  const getStakingDuration = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  const isTreasury =
    staker.sender_owner === 'BzG47NjXChMDi4sRoxx6uvPKV1Ub4V3tDhrZ1tWcjJdr';

  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {trimAddress(staker.sender_owner)}
          {isTreasury && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <ChefHat className="h-4 w-4 text-yellow-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-white border-gray-200"
                >
                  <p className="text-sm">Treasury</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {Number(staker.balance).toLocaleString()}
      </TableCell>
      <TableCell className="text-center">
        {getStakingDuration(staker.interaction_date)}
      </TableCell>
      <TableCell className="text-right">Coming Soon</TableCell>
    </TableRow>
  );
}
