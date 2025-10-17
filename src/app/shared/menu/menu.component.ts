// Component that renders the ion-menu contents and controls navigation
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { UIService } from '../../services/UI.service';

interface MenuItem {
  title: string;
  route: string;
  icon?: string;
  requiresAuth?: boolean;
}

@Component({
  selector: 'app-shared-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: false,
})
export class MenuComponent implements OnInit {
  // Menu items owned by this component
  menuItems: MenuItem[] = [
    { title: 'Home', route: '/home', icon: 'home' },
    { title: 'Search', route: '/search', icon: 'search' },
    { title: 'Account', route: '/account', icon: 'person', requiresAuth: true },
    { title: 'Settings', route: '/settings', icon: 'settings' }
  ];

  constructor(
    private router: Router,
    private UI: UIService,
    private menu: MenuController
  ) { }

  ngOnInit(): void { }

  // Called by template when user clicks an item
  async onMenuItemSelected(item: MenuItem): Promise<void> {
    try {
      // Close the menu first (push animation will be visible because menu type = push)
      await this.menu.close();
      // Navigate to route
      await this.router.navigateByUrl(item.route);
    } catch (error) {
      console.error('MenuComponent.onMenuItemSelected error', error);
    }
  }

  // Optional method to close menu programmatically
  async closeMenu(): Promise<void> {
    try {
      await this.menu.close();
    } catch (error) {
      console.error('MenuComponent.closeMenu error', error);
    }
  }
}