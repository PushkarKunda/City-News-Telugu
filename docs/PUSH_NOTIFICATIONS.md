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

2. **Push Notifications Hook** (`hooks/usePushNotifications.ts`)
   - React integration layer
   - Authentication lifecycle management
   - Deep linking handlers
   - Badge count management

3. **Settings Screen** (`app/(tabs)/settings-notifications.tsx`)
   - User notification preferences UI
   - Test notification
   - System settings link

### Backend Endpoints

- `POST /user/device/token/register` - Register FCM token
- `DELETE /user/device/token/unregister` - Unregister device
- `GET /user/notifications/preferences` - Get preferences
- `PATCH /user/notifications/preferences` - Update preferences
- `POST /user/notifications/analytics` - Track events
- `POST /user/notifications/test` - Send test notification

## Features

### Core Features

- ✅ **FCM Token Registration**: Automatically registers Expo push tokens with backend
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
- ✅ **Sync Across Devices**: Preferences sync via backend

### Analytics

- ✅ **Delivery Tracking**: Track when notifications are delivered
- ✅ **Open Tracking**: Track when notifications are tapped
- ✅ **Dismiss Tracking**: Track when notifications are dismissed
- ✅ **Badge Analytics**: Track badge count updates

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

Push notifications are automatically initialized in `app/_layout.tsx`:

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function RootLayout() {
  usePushNotifications(); // Auto-initializes on auth
  // ...
}
```

### 4. Backend Requirements

The backend must implement these endpoints:

- Store device tokens (FCM token, device type, device name)
- Store user notification preferences
- Send push notifications via Expo Push API
- Track notification analytics
- Target notifications by district, city, interests

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

Use the "Send Test Notification" button in settings, or:

```typescript
import { scheduleTestNotification } from '@/services/notifications';

await scheduleTestNotification({
  type: 'system',
  title: 'Test',
  body: 'Hello from City News Telugu!',
  sound: true
});
```

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
4. Verify backend is sending to correct Expo push token

### Deep Linking Not Working

1. Check notification data payload structure
2. Verify router is initialized when notification is tapped
3. Check for navigation errors in console

## Backend Implementation Notes

### Sending Notifications

Use Expo Push API:

```python
import requests

message = {
    "to": expo_push_token,
    "title": "Breaking News!",
    "body": "Important update in your area",
    "data": {
        "type": "breaking",
        "news_uid": "abc123"
    },
    "priority": "high",
    "sound": "default"
}

requests.post("https://exp.host/--/api/v2/push/send", json=message)
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