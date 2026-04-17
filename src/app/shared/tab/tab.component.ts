// Bottom navigation component; driven by UIService.
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';
import { UserService } from '../../services/user.service';
import { AppStateService } from '../../services/app-state.service';

@Component({
  selector: 'app-shared-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone: false
})
export class TabComponent {
  readonly UI = inject(UIService);
  readonly language = inject(LanguageService);
  readonly userService = inject(UserService);

  // Observable controlling whether tab bar displays
  showTabs$: Observable<boolean>;
  // Language stream for labels
  lang$ = this.language.lang$;
  // App state for checking login status
  appState$ = inject(AppStateService).appState$;
  // User profile for checking user type
  userProfile$ = this.userService.currentProfile$;
  // Computed observable for whether user is Restaurant type
  isRestaurantUser$ = this.userProfile$.pipe(
    map(profile => profile?.type?.toLowerCase() === 'restaurant')
  );

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.showTabs$ = this.UI.showTabs$;
  }

  // Trigger additional light-green ripples in light DOM so they stack above Ionic's native tab ripple.
  onTabPointerDown(event: PointerEvent): void {
    const tabButtonElement = event.currentTarget;
    if (!(tabButtonElement instanceof HTMLElement)) return;
    const rippleElements = Array.from(
      tabButtonElement.querySelectorAll('ion-ripple-effect.extra-tab-ripple')
    ) as HTMLIonRippleEffectElement[];
    rippleElements.forEach((rippleElement) => {
      void rippleElement.addRipple(event.clientX, event.clientY).then(removeRipple => {
        setTimeout(removeRipple, 0);
      });
    });
  }
}
