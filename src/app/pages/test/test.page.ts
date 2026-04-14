import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { LanguageService } from '../../services/language.service';

interface RouteTarget {
  label: string;
  url: string;
}

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  standalone: false,
})
export class TestPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly subscriptions: Subscription[] = [];
  private currentLanguage: 'EN' | 'TC' = 'EN';

  currentUrl = '';
  routeLabel = 'Test';
  routeDescription = '';

  readonly linkTargets: RouteTarget[] = [
    { label: 'Home', url: '/home' },
    { label: 'Search', url: '/search' },
    { label: 'User', url: '/user' },
    { label: 'Login', url: '/login' },
    { label: 'Booking', url: '/booking' },
    { label: 'Store', url: '/store' },
    { label: 'Test A', url: '/test/a' },
    { label: 'Test B', url: '/test/b' },
    { label: 'Test C', url: '/test/c' },
  ];

  ngOnInit(): void {
    this.currentLanguage = this.language.getCurrentLanguage();
    this.syncRouteState();

    this.subscriptions.push(
      this.language.lang$.subscribe(language => {
        this.currentLanguage = language;
        this.syncRouteState();
      }),
      this.route.data.subscribe(() => this.syncRouteState()),
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => this.syncRouteState()),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  navigate(url: string): void {
    this.router.navigateByUrl(url);
  }

  private syncRouteState(): void {
    const data = this.route.snapshot.data;

    this.currentUrl = this.router.url;
    this.routeLabel = data['debugLabel'] ?? 'Test';
    this.routeDescription = this.currentLanguage === 'TC'
      ? data['debugDescription_TC'] ?? ''
      : data['debugDescription_EN'] ?? '';
  }
}
