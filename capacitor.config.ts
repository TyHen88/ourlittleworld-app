import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.APP_URL ??
  "http://localhost:3000";

const serverHostname = (() => {
  try {
    return new URL(serverUrl).hostname;
  } catch {
    return undefined;
  }
})();

const config: CapacitorConfig = {
  appId: "com.ourlittleworld.app",
  appName: "Our Little World",
  webDir: "mobile-shell",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: serverHostname ? [serverHostname] : [],
  },
};

export default config;
