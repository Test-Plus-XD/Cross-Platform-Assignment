# FCM Quick Start Guide

## Setup Checklist

### 1. Get VAPID Key (2 minutes)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings > Cloud Messaging > Web Push certificates
3. Copy the Key pair (VAPID key)

### 2. Update Environment Files
```typescript
// src/environments/environment.ts
fcmVapidKey: 'YOUR_VAPID_KEY_HERE'

// src/environments/environment.prod.ts
fcmVapidKey: 'YOUR_VAPID_KEY_HERE'
```

### 3. Update angular.json
Add to `"assets"` array:
```json
{
  "glob": "firebase-messaging-sw.js",
  "input": "src",
  "output": "/"
}
```

## Basic Usage

### In Any Component
```typescript
import { FcmService } from '../services/fcm.service';

constructor(private fcmService: FcmService) {}

async ngOnInit() {
  // Request permission and get token
  const token = await this.fcmService.requestPermission();

  // Listen for messages
  this.fcmService.message$.subscribe(message => {
    if (message) {
      console.log('New notification:', message);
    }
  });
}
```

### Available Methods
```typescript
// Request permission & get token
await fcmService.requestPermission()

// Get current token
fcmService.getCurrentToken()

// Delete token
await fcmService.deleteCurrentToken()

// Check support
fcmService.isSupported()

// Check permission
fcmService.isPermissionGranted()

// Refresh token
await fcmService.refreshToken()
```

### Observables
```typescript
fcmService.token$       // FCM token changes
fcmService.message$     // Incoming messages
fcmService.permission$  // Permission status changes
```

## Backend Endpoints (To Implement)

```javascript
// Send to specific user
POST /API/FCM/send
{
  "fcmToken": "token",
  "title": "Title",
  "body": "Message",
  "data": { "url": "/path" }
}

// Subscribe to topic
POST /API/FCM/subscribe
{ "token": "token", "topic": "topic-name" }

// Send to topic
POST /API/FCM/send-to-topic
{
  "topic": "topic-name",
  "title": "Title",
  "body": "Message"
}
```

## Testing

### Browser Console
```javascript
// Check permission
Notification.permission

// Get token
localStorage.getItem('fcmToken')

// Request permission manually
Notification.requestPermission()
```

### Test Notification (Backend)
```bash
curl -X POST YOUR_API_URL/API/FCM/send \
  -H "x-api-passcode: PourRice" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken":"TOKEN","title":"Test","body":"Hello"}'
```

## Common Use Cases

### 1. Save Token on Login
```typescript
async onLogin(user: any) {
  const token = await this.fcmService.requestPermission();
  if (token) {
    // Save to user profile
    await this.userService.updateUserFcmToken(user.uid, token);
  }
}
```

### 2. Handle Notification Click
```typescript
this.fcmService.message$.subscribe(message => {
  if (message?.data?.url) {
    this.router.navigateByUrl(message.data.url);
  }
});
```

### 3. Show Custom Toast
```typescript
this.fcmService.message$.subscribe(async message => {
  if (message) {
    const toast = await this.toastController.create({
      message: message.body,
      duration: 3000,
      position: 'top'
    });
    await toast.present();
  }
});
```

## Files Created

✅ `src/app/services/fcm.service.ts` - Main service
✅ `src/app/models/fcm.model.ts` - TypeScript interfaces
✅ `src/firebase-messaging-sw.js` - Service worker
✅ `src/environments/environment.ts` - Updated with fcmVapidKey
✅ `src/environments/environment.prod.ts` - Updated with fcmVapidKey

## Next Steps

1. ✅ Get VAPID key from Firebase Console
2. ✅ Update both environment files
3. ✅ Update angular.json assets
4. ⏳ Rebuild project: `npm run build`
5. ⏳ Test in browser (localhost or HTTPS)
6. ⏳ Implement backend endpoints
7. ⏳ Integrate with features (bookings, chat, etc.)

## Need Help?

See `FCM_SETUP_GUIDE.md` for detailed documentation including:
- Complete backend implementation examples
- Error handling and troubleshooting
- Security best practices
- Browser compatibility
- Advanced use cases
