import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

interface UnreadCountResponse {
  count: number;
}

export function useUnreadCounts() {
  const { user } = useAuth();
  const enabled = Boolean(user);

  const { data: direct } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/direct-chats/unread-count"],
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: orders } = useQuery<UnreadCountResponse>({
    queryKey: ["/api/order-chats/unread-count"],
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const directCount = direct?.count ?? 0;
  const orderCount = orders?.count ?? 0;

  return {
    directCount,
    orderCount,
    totalCount: directCount + orderCount,
  };
}
