import type { Master } from "./schema";
import type { AvailabilityWindow } from "./service-time";

export const RECENT_MASTER_LIMIT = 30;
export const RECENT_MASTER_DAYS = 90;
export interface RecentMasterView { master: Master; viewedAt: string }
export interface TodayAvailability {
  date: string;
  timeZone: string;
  generatedAt: string;
  providers: Record<number, AvailabilityWindow>;
}
