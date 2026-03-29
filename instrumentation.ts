const DEFAULT_REMINDER_POLLING_INTERVAL_MS = 30_000;

type ReminderSchedulerGlobal = typeof globalThis & {
  __ourlittleworldReminderSchedulerStarted?: boolean;
  __ourlittleworldReminderSchedulerTimer?: NodeJS.Timeout;
};

function shouldStartInProcessReminderScheduler() {
  const isNodeRuntime = process.env.NEXT_RUNTIME === "nodejs";

  return (
    isNodeRuntime &&
    (
      process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_IN_PROCESS_REMINDER_SCHEDULER === "true"
    )
  );
}

function getReminderPollingIntervalMs() {
  const configuredValue = Number.parseInt(
    process.env.REMINDER_POLLING_INTERVAL_MS ?? String(DEFAULT_REMINDER_POLLING_INTERVAL_MS),
    10
  );

  if (!Number.isFinite(configuredValue) || configuredValue < 10_000) {
    return DEFAULT_REMINDER_POLLING_INTERVAL_MS;
  }

  return configuredValue;
}

export async function register() {
  if (!shouldStartInProcessReminderScheduler()) {
    return;
  }

  const globalForReminderScheduler = globalThis as ReminderSchedulerGlobal;
  if (globalForReminderScheduler.__ourlittleworldReminderSchedulerStarted) {
    return;
  }

  globalForReminderScheduler.__ourlittleworldReminderSchedulerStarted = true;

  const intervalMs = getReminderPollingIntervalMs();
  const runReminderPoll = async () => {
    try {
      const { runReminderJob } = await import("@/lib/reminder-job");
      await runReminderJob();
    } catch (error) {
      console.error("[REMINDER_SCHEDULER_ERROR]", error);
    }
  };

  void runReminderPoll();

  globalForReminderScheduler.__ourlittleworldReminderSchedulerTimer = setInterval(() => {
    void runReminderPoll();
  }, intervalMs);
}
