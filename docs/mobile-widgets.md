# Mobile Widgets

This repo now exposes a shared widget summary contract at `GET /api/widget/summary`.

## Widget payloads

Couple widgets receive:

- `daysTogether`
- `unreadChatCount`
- `nextReminder`
- `budget`

Single widgets receive:

- `nextReminder`
- `nextTrip`
- `budget`

Both payloads also include `theme` and `generatedAt`.

## Native shell

The mobile wrapper uses Capacitor with `server.url`, because this app is a server-rendered Next.js deployment rather than a static export.

Set `CAPACITOR_SERVER_URL` to the public web app URL before running:

```bash
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
```

For Android emulators during local development, use `http://10.0.2.2:3000`.

## Widget sync flow

When the app is running inside a Capacitor shell, the web app periodically fetches `/api/widget/summary` and calls a native plugin named `WidgetSync`:

- `saveWidgetSummary({ summaryJson })`
- `reloadWidgets()`

That native plugin should persist the JSON into shared native storage and then ask the platform widget system to refresh.

## iOS implementation

Build an iOS `WidgetKit` extension and store the summary JSON in an App Group container shared by:

- the Capacitor app target
- the widget extension target

Recommended flow:

1. `WidgetSync.saveWidgetSummary` writes the JSON to `UserDefaults(suiteName:)` in the App Group.
2. `WidgetSync.reloadWidgets` calls `WidgetCenter.shared.reloadAllTimelines()`.
3. The widget extension decodes the JSON and renders:
   - Couple: days together, unread chat, next reminder, budget
   - Single: next reminder, next trip, budget

## Android implementation

Build an Android home-screen widget with Glance/App Widgets.

Recommended flow:

1. `WidgetSync.saveWidgetSummary` writes the JSON to shared app storage.
2. `WidgetSync.reloadWidgets` triggers `GlanceAppWidget.updateAll(...)`.
3. The widget reads the stored JSON and renders:
   - Couple: days together, unread chat, next reminder, budget
   - Single: next reminder, next trip, budget

## Current limitation

`unreadChatCount` is now backed by persisted read state in `chat_read_states`. The count becomes accurate after a user opens the couple chat at least once in a build that includes this feature.
