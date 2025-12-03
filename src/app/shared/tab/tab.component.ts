// Bottom tabs component; driven by UIService
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';
import { UserService } from '../../services/user.service';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-shared-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone: false
})
export class TabComponent {
  // Observable controlling whether tab bar displays
  showTabs$: Observable<boolean>;
  // Language stream for labels
  lang$ = this.language.lang$;
  // App state for checking login status
  appState$ = inject(AppComponent).appState$;
  // User profile for checking user type
  userProfile$ = this.userService.currentProfile$;
  // Computed observable for whether user is Restaurant type
  isRestaurantUser$ = this.userProfile$.pipe(
    map(profile => profile?.type?.toLowerCase() === 'restaurant')
  );

  constructor(
    readonly UI: UIService,
    readonly language: LanguageService,
    readonly userService: UserService
  ) {
    this.showTabs$ = this.UI.showTabs$;
    this.showTabs$.subscribe(v => console.debug('TabComponent showTabs =>', v));
  }
}