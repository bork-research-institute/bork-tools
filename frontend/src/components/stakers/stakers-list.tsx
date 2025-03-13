'use client';
import { formatDistanceToNow } from 'date-fns';
import { useStakersFromDB } from '../../hooks/use-stakers-from-db';
import type { StakerData } from '../../lib/services/database/get-stakers-from-db';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { StakersListRow } from './stakers-list-row';
import { StakersListRowSkeleton } from './stakers-list-row-skeleton';

export function StakersList() {
  const { data: response, status, error } = useStakersFromDB();

  const stakers = response?.stakers || [];
  const lastUpdated = response?.lastUpdated;

  // Group stakers by sender wallet and get the most recent entry for each
  const latestStakers = stakers.reduce<Map<string, StakerData>>(
    (acc, staker) => {
      const existing = acc.get(staker.sender_owner);
      if (
        !existing ||
        new Date(staker.interaction_date) > new Date(existing.interaction_date)
      ) {
        acc.set(staker.sender_owner, staker);
      }
      return acc;
    },
    new Map(),
  );

  // Convert map to array and sort by balance
  const sortedStakers = Array.from(latestStakers.values()).sort(
    (a, b) => Number(b.balance) - Number(a.balance),
  );

  // Calculate summary statistics using the latest balances
  const totalStaked = sortedStakers.reduce(
    (sum, staker) => sum + Number(staker.balance),
    0,
  );
  const totalStakers = sortedStakers.length;

  if (status === 'error') {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-700">Error loading stakers: {error?.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stakers</h2>
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Total Staked</h3>
          <p className="text-2xl font-bold">{totalStaked.toLocaleString()}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">
            Number of Stakers
          </h3>
          <p className="text-2xl font-bold">{totalStakers.toLocaleString()}</p>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead className="text-center">Staked Amount</TableHead>
              <TableHead className="text-center">Staking Duration</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {status === 'pending' && (
              <>
                <StakersListRowSkeleton />
                <StakersListRowSkeleton />
                <StakersListRowSkeleton />
                <StakersListRowSkeleton />
                <StakersListRowSkeleton />
              </>
            )}
            {sortedStakers.map((staker: StakerData) => (
              <StakersListRow key={staker.sender_owner} staker={staker} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
