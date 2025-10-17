// Bottom tabs component; template owns the routes and labels
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformService } from '../../services/platform.service';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-shared-tab',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone: false
})
export class TabComponent {
  // Observable boolean that is true when running on mobile
  isMobile$: Observable<boolean>;
  // Observable controlling whether tab bar displays
  showTabs$: Observable<boolean>;
  // Observable for bilingual labels
  lang$ = this.language.lang$;

  constructor(
    readonly platform: PlatformService,
    readonly UI: UIService,
    readonly language: LanguageService
  ) {
    // Assign platform-driven visibility observable from UIService
    this.isMobile$ = this.platform.isMobile$;
    this.showTabs$ = this.UI.showTabs$;
    console.log('TabComponent initialised, showTabs$ assigned');
  }
}