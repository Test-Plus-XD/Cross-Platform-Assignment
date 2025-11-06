// Bottom tabs component; driven by UIService
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';

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

  constructor(
    readonly UI: UIService,
    readonly language: LanguageService
  ) {
    this.showTabs$ = this.UI.showTabs$;
    this.showTabs$.subscribe(v => console.debug('TabComponent showTabs =>', v));
  }
}
