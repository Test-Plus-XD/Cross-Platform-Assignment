// Component that renders bottom ion-tabs bar when UIService says to show
import { Component } from '@angular/core';
import { UIService } from '../../services/UI.service';
import { Observable } from 'rxjs';

interface TabItem {
  label: string;
  tabRoute: string;
  icon?: string;
}

@Component({
  selector: 'app-shared-tabs',
  templateUrl: './tab.component.html',
  styleUrls: ['./tab.component.scss'],
  standalone: false,
})
export class TabComponent {
  // Tabs data for the ion-tab-bar
  tabItems: TabItem[] = [
    { label: 'Home', tabRoute: '/home', icon: 'home' },
    { label: 'Search', tabRoute: '/search', icon: 'search' },
    { label: 'Account', tabRoute: '/account', icon: 'person' }
  ];

  // Observable controlling whether tab bar displays
  showTabs$: Observable<boolean>;

  constructor(private uiService: UIService) {
    this.showTabs$ = this.uiService.showTabs$;
  }
}