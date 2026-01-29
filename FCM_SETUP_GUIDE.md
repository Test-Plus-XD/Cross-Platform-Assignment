# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
This guide covers the setup and usage of Firebase Cloud Messaging in your Angular/Ionic application.

## Files Created
1. **`src/app/services/fcm.service.ts`** - Main FCM service
2. **`src/firebase-messaging-sw.js`** - Service worker for background notifications
3. **Updated environment files** - Added `fcmVapidKey` configuration

---

## Step 1: Get Your VAPID Key from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cross-platform-assignmen-b97cc`
3. Click on **Settings (⚙️)** > **Project settings**
4. Navigate to **Cloud Messaging** tab
5. Scroll down to **Web configuration**
6. Under **Web Push certificates**, you'll find your **Key pair** (VAPID key)
7. If no key exists, click **Generate key pair**
8. Copy the key (starts with `B...`)

## Step 2: Update Environment Files

Replace `YOUR_FIREBASE_VAPID_KEY_HERE` in both files:

**`src/environments/environment.ts`**
```typescript
fcmVapidKey: 'BMx7Y...' // Your actual VAPID key
```

**`src/environments/environment.prod.ts`**
```typescript
fcmVapidKey: 'BMx7Y...' // Your actual VAPID key
```

---

## Step 3: Update angular.json (Copy Service Worker to Build)

Add the firebase-messaging-sw.js to your assets in `angular.json`:

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/manifest.webmanifest",
  {
    "glob": "firebase-messaging-sw.js",
    "input": "src",
    "output": "/"
  }
]
```

---

## Step 4: Usage Examples

### Basic Usage in a Component

```typescript
import { Component, OnInit } from '@angular/core';
import { FcmService } from '../services/fcm.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.page.html'
})
export class ExamplePage implements OnInit {
  fcmToken: string | null = null;
  isSupported = false;
  isPermissionGranted = false;

  constructor(private fcmService: FcmService) {}

  ngOnInit() {
    // Check if FCM is supported
    this.isSupported = this.fcmService.isSupported();

    // Subscribe to token changes
    this.fcmService.token$.subscribe(token => {
      this.fcmToken = token;
      if (token) {
        console.log('FCM Token:', token);
        // Send token to your backend
        this.sendTokenToBackend(token);
      }
    });

    // Subscribe to incoming messages (foreground)
    this.fcmService.message$.subscribe(message => {
      if (message) {
        console.log('Received message:', message);
        // Handle the message (show toast, update UI, etc.)
        this.handleIncomingMessage(message);
      }
    });

    // Subscribe to permission changes
    this.fcmService.permission$.subscribe(permission => {
      this.isPermissionGranted = permission === 'granted';
    });
  }

  async requestNotificationPermission() {
    const token = await this.fcmService.requestPermission();
    if (token) {
      console.log('Permission granted, token:', token);
    } else {
      console.log('Permission denied or error occurred');
    }
  }

  async deleteToken() {
    const success = await this.fcmService.deleteCurrentToken();
    if (success) {
      console.log('Token deleted successfully');
    }
  }

  private sendTokenToBackend(token: string) {
    // Send token to your backend API
    // POST /API/Users/:uid { fcmToken: token }
  }

  private handleIncomingMessage(message: any) {
    // Show a toast or alert
    // Update UI based on message content
  }
}
```

### HTML Template Example

```html
<ion-header>
  <ion-toolbar>
    <ion-title>Notifications</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="p-4">
    <!-- Notification Support Status -->
    <ion-card>
      <ion-card-header>
        <ion-card-title>Notification Status</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>Supported: {{ isSupported ? 'Yes' : 'No' }}</p>
        <p>Permission: {{ isPermissionGranted ? 'Granted' : 'Not Granted' }}</p>
        <p *ngIf="fcmToken">Token: {{ fcmToken.substring(0, 20) }}...</p>
      </ion-card-content>
    </ion-card>

    <!-- Request Permission Button -->
    <ion-button
      expand="block"
      (click)="requestNotificationPermission()"
      *ngIf="!isPermissionGranted">
      Enable Notifications
    </ion-button>

    <!-- Delete Token Button -->
    <ion-button
      expand="block"
      color="danger"
      (click)="deleteToken()"
      *ngIf="isPermissionGranted">
      Disable Notifications
    </ion-button>
  </div>
</ion-content>
```

---

## Step 5: Integrate with User Profile (Optional)

Store FCM tokens in user profiles for targeted notifications:

### Update User Service

```typescript
async updateUserFcmToken(uid: string, fcmToken: string) {
  try {
    const token = await this.authService.getIdToken();
    await this.dataService.put(
      `/API/Users/${uid}`,
      { fcmToken },
      token
    ).toPromise();
    console.log('FCM token updated in user profile');
  } catch (error) {
    console.error('Error updating FCM token:', error);
  }
}
```

### Update User Profile After Login

```typescript
// In your login component or auth service
async onLoginSuccess(user: any) {
  const fcmToken = await this.fcmService.requestPermission();
  if (fcmToken) {
    await this.userService.updateUserFcmToken(user.uid, fcmToken);
  }
}
```

---

## Step 6: Backend Implementation (Sending Notifications)

### Install Firebase Admin SDK (Backend)

```bash
# Already installed in your project
npm install firebase-admin
```

### Backend Endpoint Example (Node.js/Express)

```javascript
// In ..\Vercel-Express-API\API.js

import admin from 'firebase-admin';

// Send notification to specific user
app.post('/API/FCM/send', authenticate, async (request, response) => {
  try {
    const { fcmToken, title, body, data } = request.body;

    if (!fcmToken || !title || !body) {
      return response.status(400).json({
        error: 'fcmToken, title, and body are required'
      });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      token: fcmToken
    };

    const result = await admin.messaging().send(message);
    console.log('[FCM] Successfully sent message:', result);

    response.json({ success: true, messageId: result });
  } catch (error) {
    console.error('[FCM] Error sending message:', error);
    response.status(500).json({ error: 'Failed to send notification' });
  }
});

// Subscribe to topic
app.post('/API/FCM/subscribe', authenticate, async (request, response) => {
  try {
    const { token, topic } = request.body;

    if (!token || !topic) {
      return response.status(400).json({
        error: 'token and topic are required'
      });
    }

    const result = await admin.messaging().subscribeToTopic([token], topic);
    console.log('[FCM] Subscribed to topic:', result);

    response.json({ success: true, result });
  } catch (error) {
    console.error('[FCM] Error subscribing to topic:', error);
    response.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from topic
app.post('/API/FCM/unsubscribe', authenticate, async (request, response) => {
  try {
    const { token, topic } = request.body;

    if (!token || !topic) {
      return response.status(400).json({
        error: 'token and topic are required'
      });
    }

    const result = await admin.messaging().unsubscribeFromTopic([token], topic);
    console.log('[FCM] Unsubscribed from topic:', result);

    response.json({ success: true, result });
  } catch (error) {
    console.error('[FCM] Error unsubscribing from topic:', error);
    response.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Send to topic
app.post('/API/FCM/send-to-topic', authenticate, async (request, response) => {
  try {
    const { topic, title, body, data } = request.body;

    if (!topic || !title || !body) {
      return response.status(400).json({
        error: 'topic, title, and body are required'
      });
    }

    const message = {
      notification: { title, body },
      data: data || {},
      topic: topic
    };

    const result = await admin.messaging().send(message);
    console.log('[FCM] Successfully sent to topic:', result);

    response.json({ success: true, messageId: result });
  } catch (error) {
    console.error('[FCM] Error sending to topic:', error);
    response.status(500).json({ error: 'Failed to send notification' });
  }
});
```

---

## Step 7: Testing

### Test in Browser Console

```javascript
// Request permission
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission);
});

// Check current token
const token = localStorage.getItem('fcmToken');
console.log('Current FCM Token:', token);
```

### Test with cURL (Backend)

```bash
# Send notification to specific token
curl -X POST https://vercel-express-api-alpha.vercel.app/API/FCM/send \
  -H "x-api-passcode: PourRice" \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN",
    "title": "Test Notification",
    "body": "This is a test message",
    "data": { "url": "/restaurant/123" }
  }'
```

---

## Common Use Cases

### 1. Booking Confirmation Notification
```typescript
// When booking is confirmed
const fcmToken = user.fcmToken; // From user profile
await this.sendNotification(fcmToken, {
  title: 'Booking Confirmed',
  body: 'Your reservation at Dragon Palace is confirmed for Dec 25, 2025',
  data: { url: '/bookings' }
});
```

### 2. New Review Notification (Restaurant Owner)
```typescript
// When new review is posted
const restaurantOwner = await this.getRestaurantOwner(restaurantId);
if (restaurantOwner.fcmToken) {
  await this.sendNotification(restaurantOwner.fcmToken, {
    title: 'New Review',
    body: 'Someone left a 5-star review on your restaurant!',
    data: { url: `/restaurant/${restaurantId}` }
  });
}
```

### 3. Chat Message Notification
```typescript
// When chat message is sent
const recipient = await this.getRecipient(recipientId);
if (recipient.fcmToken) {
  await this.sendNotification(recipient.fcmToken, {
    title: `New message from ${senderName}`,
    body: messagePreview,
    data: { url: '/chat', roomId: chatRoomId }
  });
}
```

---

## Security Best Practices

1. **Never expose VAPID key in client-side code** - Already handled in environment files
2. **Store FCM tokens securely** - Tokens are stored in user profiles with authentication
3. **Validate tokens on backend** - Always verify Firebase ID tokens before sending notifications
4. **Rate limit notification sending** - Prevent spam by implementing rate limits
5. **Handle token refresh** - Tokens can expire, implement token refresh logic
6. **Delete tokens on logout** - Clean up tokens when users sign out

---

## Troubleshooting

### Issue: "Notifications not working"
- Check if VAPID key is correctly set in environment files
- Verify notification permission is granted
- Check browser console for errors
- Ensure service worker is registered

### Issue: "Token not generated"
- Make sure you're running on HTTPS (or localhost)
- Check Firebase project configuration
- Verify VAPID key is valid
- Check browser compatibility (Chrome, Firefox, Safari)

### Issue: "Background notifications not working"
- Ensure `firebase-messaging-sw.js` is in the root of your served files
- Check service worker registration in DevTools > Application > Service Workers
- Verify Firebase config in service worker matches your project

### Issue: "Permission denied"
- User must manually grant permission
- Check browser notification settings
- Try requesting permission again after explaining benefits

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome  | ✅ Full |
| Firefox | ✅ Full |
| Safari  | ✅ (iOS 16.4+) |
| Edge    | ✅ Full |
| Opera   | ✅ Full |

---

## Next Steps

1. Get your VAPID key from Firebase Console
2. Update environment files with the key
3. Update `angular.json` to include service worker
4. Test in development environment
5. Implement backend endpoints for sending notifications
6. Integrate with your existing features (bookings, chat, reviews)
7. Deploy and test in production

---

## References

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
