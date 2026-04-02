// Bottom tabs component; driven by UIService
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
    this.showTabs$.subscribe(v => console.debug('TabComponent showTabs =>', v));
  }
}