# Push Notifications

This document describes the push notification system implementation in City News Telugu.

## Architecture

### Components

1. **Notification Service** (`services/notifications.ts`)
   - Core push notification logic
   - FCM token management
   - Backend registration
   - Preferences management
   - Analytics tracking

2. **Push Notifications Hook** (`hooks/usePushNotifications.tsx`)
   - React integration layer (provider mounted once in `app/_layout.tsx`)
   - Authentication lifecycle management
   - Deep linking handlers
   - Badge count management

3. **Settings Screen** (`app/(tabs)/settings-notifications.tsx`)
   - User notification preferences UI
   - Test notification
   - System settings link

### Backend Endpoints

- `POST /user/device/token/register` - Register native FCM token
- `DELETE /user/device/token/unregister` - Unregister device
- `GET /user/notifications/preferences` - Not currently exposed by the backend
- `PATCH /user/notifications/preferences` - Not currently exposed by the backend
- `POST /user/notifications/analytics` - Not currently exposed by the backend
- `POST /user/notifications/test` - Not currently exposed by the backend

> Preferences are persisted locally on-device. Analytics and the test-send
> endpoint are disabled until those routes are added to the backend.

## Features

### Core Features

- ✅ **FCM Token Registration**: Automatically registers the native FCM token with the backend
- ✅ **Permission Management**: Requests and manages notification permissions
- ✅ **Foreground Handling**: Handles notifications while app is open
- ✅ **Background Handling**: System handles notifications when app is closed
- ✅ **Deep Linking**: Tapping notifications navigates to relevant content
- ✅ **Badge Count**: Real-time unread badge updates

### Rich Notifications

- ✅ **Notification Channels**: Android notification channels for different types
- ✅ **Notification Types**: Breaking news, local news, polls, comments, events, system
- ✅ **Custom Sounds**: Support for notification sounds (iOS/Android)

### Smart Targeting

- ✅ **Category Preferences**: Users can toggle notification types
- ✅ **Quiet Hours**: Do Not Disturb with configurable time ranges
- ✅ **Geo-Targeting**: Backend targets notifications to user's district/city
- ✅ **Interest-Based**: Backend targets notifications based on category interests

### User Preferences

- ✅ **Master Toggle**: Enable/disable all push notifications
- ✅ **Per-Type Toggles**: Control each notification category
- ✅ **Quiet Hours**: Configure Do Not Disturb schedule
- ℹ️ **Local Persistence**: Preferences are stored on-device until the backend exposes a preferences endpoint

### Analytics

- ⏳ **Delivery/Open Tracking**: Pending a backend analytics endpoint (currently a no-op)

## Setup

### 1. Install Dependencies

```bash
npm install expo-notifications expo-device expo-constants
```

### 2. Configure app.json

Add the expo-notifications plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#4648D4",
          "sounds": ["./assets/notification-sound.wav"],
          "mode": "production"
        }
      ]
    ]
  }
}
```

### 3. Initialize in App

Push notifications are initialized automatically by the provider mounted in `app/_layout.tsx`:

```typescript
import { PushNotificationsProvider } from '@/hooks/usePushNotifications';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PushNotificationsProvider>{/* app */}</PushNotificationsProvider>
    </QueryClientProvider>
  );
}
```

The provider registers the device token when the user is authenticated and installs the notification listeners once for the whole app.

### 4. Backend Requirements

The backend must implement these endpoints:

- Store device tokens (native FCM token, device type, device name, app version)
- Store user notification preferences
- Send push notifications via Firebase Cloud Messaging
- Track notification analytics
- Target notifications by district, city, interests

> **Important:** The mobile app registers the **native device push token**
> (`Notifications.getDevicePushTokenAsync()`), not an Expo push token
> (`ExponentPushToken[...]`). Expo push tokens only work with the Expo Push API;
> the backend's `/user/device/token/register` endpoint and
> `POST /notifications/send/push` use Firebase Cloud Messaging.

> **iOS:** `getDevicePushTokenAsync()` returns the APNs token on iOS. For
> Firebase Admin to deliver to iOS, the backend must either use an FCM
> registration token or route APNs tokens through Firebase/APNs correctly.

## Notification Types

| Type | Channel | Priority | Description |
|------|---------|----------|-------------|
| `breaking` | breaking-news | MAX | Urgent breaking news |
| `news` | local-news | HIGH | Local news updates |
| `poll` | poll-updates | DEFAULT | New polls, voting results |
| `comment` | comment-replies | DEFAULT | Comment replies |
| `event` | events | DEFAULT | Local events |
| `system` | system-updates | DEFAULT | App updates, announcements |

## Deep Linking

Notifications include data payloads that trigger navigation:

```typescript
// Breaking news / news
{ type: 'news', news_uid: 'abc123' } → /news/abc123

// Polls
{ type: 'poll', poll_uid: 'xyz789' } → /?poll=xyz789

// Comments
{ type: 'comment', news_uid: 'abc123' } → /news/abc123?comments=1

// Events
{ type: 'event', event_uid: 'evt456' } → /local?event=evt456

// System
{ type: 'system', route: '/help' } → /help
```

## Analytics Events

Push notification events tracked for analytics:

```typescript
interface NotificationAnalytics {
  event: 'delivered' | 'opened' | 'dismissed';
  notification_id: string;
  type: NotificationType;
  timestamp: number;
  device_id: string;
}
```

## Smart Features

### Quiet Hours

Users can configure Do Not Disturb periods:

```typescript
{
  quiet_hours_enabled: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00"
}
```

During quiet hours:
- Notifications are silenced
- No vibration
- No sound
- Can still show in notification tray (depending on priority)

### Category Preferences

Users can enable/disable each notification type:

```typescript
{
  enabled: true, // Master toggle
  breaking_news: true,
  local_news: true,
  poll_updates: false,
  comments: true,
  events: true,
  system: true
}
```

## Testing

### Test Notifications

Send a test push from your backend or the Firebase Console. Local test
notification helpers are not included in production builds.

### Simulators

- **iOS Simulator**: Notifications work in iOS 16+ simulators
- **Android Emulator**: Notifications work with Google Play Services

### Physical Device

Push notifications require a physical device. You'll see a warning in settings if using a simulator.

## Troubleshooting

### No Token Received

1. Ensure you're on a physical device
2. Check notification permissions in system settings
3. Verify EAS project ID is configured in `app.json`

### Notifications Not Received

1. Check device token is registered with backend
2. Verify user preferences have notifications enabled
3. Check quiet hours aren't active
4. Verify backend is sending to the registered FCM token (not an Expo push token)

### Deep Linking Not Working

1. Check notification data payload structure
2. Verify router is initialized when notification is tapped
3. Check for navigation errors in console

## Backend Implementation Notes

### Sending Notifications

The backend sends through Firebase Cloud Messaging (Admin SDK):

```python
from firebase_admin import messaging

message = messaging.Message(
    token=fcm_token,
    notification=messaging.Notification(
        title="Breaking News!",
        body="Important update in your area",
    ),
    data={
        "type": "breaking",
        "news_uid": "abc123",
    },
)

messaging.send(message)
```

### Targeting

Backend should filter recipients by:
- District/City (geo-targeting)
- Category preferences
- Notification type preferences
- Quiet hours (if implemented server-side)

### Token Management

- Store tokens with user association
- Update tokens on app update
- Remove tokens on user logout
- Handle token expiration

## Future Enhancements

- **Image Attachments**: Add big picture style notifications
- **Action Buttons**: Add quick actions (Mark Read, Open, Dismiss)
- **Scheduled Notifications**: Allow users to schedule reminders
- **Notification Groups**: Group notifications by topic
- **Rich Media**: Video/GIF support in notifications
- **Location-Based**: Real-time location targeting

## Security

- FCM tokens are stored server-side
- Tokens are associated with authenticated users
- Analytics are anonymized
- No sensitive data in notification payloads
- HTTPS required for all API calls

## Performance

- Token registration happens once per session
- Preferences are cached locally
- Analytics are fire-and-forget (non-blocking)
- Badge count updates are debounced
- Deep linking uses React Navigation's built-in queue