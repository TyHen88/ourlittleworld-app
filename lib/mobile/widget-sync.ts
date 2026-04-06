import { Capacitor, registerPlugin } from "@capacitor/core";

type WidgetSyncPlugin = {
  saveWidgetSummary(options: { summaryJson: string }): Promise<void>;
  reloadWidgets(): Promise<void>;
};

const WidgetSync = registerPlugin<WidgetSyncPlugin>("WidgetSync");

export async function syncNativeWidgetSummary() {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const response = await fetch("/api/widget/summary", {
      method: "GET",
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.data) {
      return false;
    }

    await WidgetSync.saveWidgetSummary({
      summaryJson: JSON.stringify(payload.data),
    });
    await WidgetSync.reloadWidgets();

    return true;
  } catch (error) {
    console.warn("Native widget sync skipped:", error);
    return false;
  }
}
