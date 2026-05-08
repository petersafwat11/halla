import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import subscriptionService from '../../services/subscriptionService';

/**
 * Fetch the calling user's payment history (paginated). Mirrors web `useMyPayments`.
 */
export function useMyPayments(params = {}) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['subscriptions', 'my-payments', params],
    queryFn: () => subscriptionService.getMyPayments(params),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  });
}
