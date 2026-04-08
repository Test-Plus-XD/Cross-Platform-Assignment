import { TestBed } from '@angular/core/testing';
import { MessagingService, NOTIFICATION_TEMPLATES } from './messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessagingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check if notifications are supported', () => {
    const isSupported = service.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should return current token', () => {
    const token = service.getCurrentToken();
    expect(token === null || typeof token === 'string').toBeTruthy();
  });

  it('should return current permission status', () => {
    const permission = service.getCurrentPermission();
    expect(['granted', 'denied', 'default'].includes(permission)).toBeTruthy();
  });

  it('should expose token observable', (done) => {
    service.getToken$().subscribe(token => {
      expect(token === null || typeof token === 'string').toBeTruthy();
      done();
    });
  });

  it('should expose message observable', (done) => {
    service.getMessages$().subscribe(message => {
      expect(message === null || typeof message === 'object').toBeTruthy();
      done();
    });
  });

  it('should expose permission observable', (done) => {
    service.getPermission$().subscribe(permission => {
      expect(['granted', 'denied', 'default'].includes(permission)).toBeTruthy();
      done();
    });
  });

  it('should check if permission is granted', () => {
    const isGranted = service.isPermissionGranted();
    expect(typeof isGranted).toBe('boolean');
  });

  it('should generate notification from template', () => {
    const notification = service.generateNotification('booking_confirmed', {
      restaurantName: 'Test Restaurant',
      dateTime: '2025-12-25',
      bookingId: 'test123'
    });

    expect(notification.title).toBe('Booking Confirmed');
    expect(notification.body).toContain('Test Restaurant');
    expect(notification.data?.bookingId).toBe('test123');
  });

  it('should generate booking notification URLs that match existing routes', () => {
    const bookingTypes = ['booking_confirmed', 'booking_cancelled', 'booking_reminder'] as const;

    bookingTypes.forEach((type) => {
      const notification = service.generateNotification(type, {
        restaurantName: 'Test Restaurant',
        dateTime: '2025-12-25',
        timeUntil: '2 hours',
        bookingId: 'booking123'
      });

      expect(notification.data?.url).toBe('/booking');
    });
  });

  it('should generate non-booking template URLs that match existing route shapes', () => {
    const params = { restaurantId: 'restaurant123', roomId: 'room123' };

    const reviewUrl = NOTIFICATION_TEMPLATES.new_review.dataTemplate?.(params)?.url;
    const chatUrl = NOTIFICATION_TEMPLATES.chat_message.dataTemplate?.(params)?.url;
    const storeUrl = NOTIFICATION_TEMPLATES.restaurant_claimed.dataTemplate?.(params)?.url;

    expect(reviewUrl).toBe('/restaurant/restaurant123');
    expect(chatUrl).toBe('/chat/room123');
    expect(storeUrl).toBe('/store');
  });
});
