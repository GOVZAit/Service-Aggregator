import {
  getInactiveProviderCandidates,
  markInactivityHidden,
  markInactivityReminder,
  seedProviderActivity,
  setProviderVisibility,
} from "./provider-service";
import { sendPushToUser } from "./push-service";

const REMINDER_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
const HIDE_AFTER_MS = 37 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function runProviderInactivityCheck() {
  await seedProviderActivity();
  const now = Date.now();
  const candidates = await getInactiveProviderCandidates();

  for (const candidate of candidates) {
    const inactiveFor = now - new Date(candidate.last_active_at).getTime();

    if (
      inactiveFor >= REMINDER_AFTER_MS &&
      inactiveFor < HIDE_AFTER_MS &&
      !candidate.reminder_sent_at
    ) {
      await sendPushToUser(candidate.user_id, {
        title: "GOVZA: профиль давно не обновлялся",
        body: "Вы не заходили около месяца. Откройте GOVZA, чтобы профиль оставался видимым клиентам.",
        url: candidate.role === "organization" ? "/organization/profile" : "/master/profile",
        tag: "provider-inactivity-reminder",
      });
      await markInactivityReminder(candidate.user_id);
    }

    if (
      inactiveFor >= HIDE_AFTER_MS &&
      !candidate.hidden_at &&
      candidate.master_id
    ) {
      await setProviderVisibility(candidate.master_id, false, "inactivity");
      await markInactivityHidden(candidate.user_id);
      await sendPushToUser(candidate.user_id, {
        title: "Профиль временно скрыт",
        body: "Профиль скрыт из поиска из-за долгого отсутствия. Просто войдите в GOVZA — он снова станет видимым.",
        url: "/auth",
        tag: "provider-inactivity-hidden",
      });
    }
  }
}

export function startProviderLifecycleScheduler() {
  const run = () => {
    runProviderInactivityCheck().catch((error) => {
      console.error("Provider inactivity check failed", error);
    });
  };
  const timer = setTimeout(run, 15_000);
  timer.unref?.();
  const interval = setInterval(run, CHECK_INTERVAL_MS);
  interval.unref?.();
}
