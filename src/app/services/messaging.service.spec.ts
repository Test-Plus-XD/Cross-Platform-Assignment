import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MessagingService, NOTIFICATION_TEMPLATES } from './messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(MessagingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check if notifications are supported', async () => {
    const isSupported = await service.isSupported();
    expect(typeof isSupported).toBe('boolean');
  });

  it('should return current token', () => {
    const token = service.getCurrentToken();
    expect(token === null || typeof token === 'string').toBeTruthy();
  });

  it('should return current permission status', () => {
    const permission = service.getCurrentPermission();
    expect(['granted', 'denied', 'prompt'].includes(permission)).toBeTruthy();
  });

  it('should expose token observable', () => {
    expect(service.getToken$()).toBeTruthy();
  });

  it('should expose message observable', () => {
    expect(service.getMessages$()).toBeTruthy();
  });

  it('should expose permission observable', (done) => {
    service.getPermission$().subscribe(permission => {
      expect(['granted', 'denied', 'prompt'].includes(permission)).toBeTruthy();
      done();
    });
  });

  it('should check if permission is granted', async () => {
    const isGranted = await service.isPermissionGranted();
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

      expect(notification.data?.route).toBe('/booking');
    });
  });

  it('should generate non-booking template routes that match existing route shapes', () => {
    const params = {
      restaurantId: 'restaurant123',
      roomId: 'room123',
      senderName: 'Test Sender',
      messagePreview: 'Hello world',
      messageId: 'message123'
    };

    const reviewRoute = NOTIFICATION_TEMPLATES.new_review.dataTemplate?.(params)?.route;
    const chatRoute = NOTIFICATION_TEMPLATES.chat_message.dataTemplate?.(params)?.route;
    const storeRoute = NOTIFICATION_TEMPLATES.restaurant_claimed.dataTemplate?.(params)?.route;

    expect(reviewRoute).toBe('/restaurant/restaurant123');
    expect(chatRoute).toBe('/chat/room123');
    expect(storeRoute).toBe('/store');
  });

  it('should convert legacy notification URLs into Angular routes', () => {
    expect(service.resolveRoute({ url: 'pourrice://bookings' })).toBe('/booking');
    expect(service.resolveRoute({ url: 'pourrice://chat/room123' })).toBe('/chat/room123');
    expect(service.resolveRoute({ url: 'pourrice://menu/restaurant123' })).toBe('/restaurant/restaurant123?menu=open');
  });
});
