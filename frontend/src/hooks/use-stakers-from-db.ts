import { useQuery } from '@tanstack/react-query';
import { getStakersFromDB } from '../lib/services/database/get-stakers-from-db';

export function useStakersFromDB() {
  return useQuery({
    queryKey: ['stakers'] as const,
    queryFn: getStakersFromDB,
  });
}
