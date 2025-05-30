import { useQuery } from '@tanstack/react-query';

interface BackendStatus {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export function useBackendStatus() {
  return useQuery<BackendStatus>({
    queryKey: ['backend-status'],
    queryFn: async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL is not configured');
      }

      const response = await fetch(`${backendUrl}/status`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    },
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    staleTime: 90 * 1000, // Consider data stale after 90 seconds
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: (previousData) => previousData,
  });
}
