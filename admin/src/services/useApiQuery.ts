import { useQuery, type QueryKey } from '@tanstack/react-query';
import { ApiError } from './apiClient';

/**
 * Read-only API call with caching, abort-on-unmount (the signal is passed to fetch), and a retry
 * policy that never retries a definite answer (4xx) but does retry flaky networks/5xx twice.
 */
export function useApiQuery<T>(key: QueryKey, load: (signal: AbortSignal) => Promise<T>, options: { enabled?: boolean; staleTime?: number } = {}) {
  return useQuery<T, ApiError | Error>({
    queryKey: ['api', ...key],
    queryFn: ({ signal }) => load(signal),
    staleTime: options.staleTime ?? 30_000,
    enabled: options.enabled ?? true,
    retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
  });
}
