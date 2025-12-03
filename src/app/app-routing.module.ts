import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './services/guard.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'test',
    data: { title: { Header_EN: 'Test', Header_TC: '測試' } },
    loadChildren: () => import('./pages/test/test.module').then(m => m.TestPageModule)
  },
  {
    path: 'home',
    data: { title: { Header_EN: 'Home', Header_TC: '主頁' } },
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'search',
    data: { title: { Header_EN: 'Search', Header_TC: '搜尋' } },
    loadChildren: () => import('./pages/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'restaurant/:id',
    data: { title: { Header_EN: 'Restaurant', Header_TC: '餐廳' } },
    loadChildren: () => import('./pages/restaurant/restaurant.module').then(m => m.RestaurantPageModule)
  },
  {
    path: 'user',
    data: { title: { Header_EN: 'Account', Header_TC: '帳戶' } },
    canActivate: [AuthGuard], // Protect this route
    loadChildren: () => import('./pages/user/user.module').then(m => m.UserPageModule)
  },
  {
    path: 'login',
    data: { title: { Header_EN: 'Login', Header_TC: '登入' } },
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'booking',
    data: { title: { Header_EN: 'Booking', Header_TC: '預訂' } },
    loadChildren: () => import('./pages/booking/booking.module').then(m => m.BookingPageModule)
  },
  {
    path: 'store',
    data: { title: { Header_EN: 'Store', Header_TC: '鋪戶' } },
    loadChildren: () => import('./pages/store/store.module').then( m => m.StorePageModule)
  },
  {
    path: 'chat/:id',
    data: { title: { Header_EN: 'Chat', Header_TC: '聊天' } },
    loadChildren: () => import('./pages/chat/chat.module').then( m => m.ChatPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      //useHash: true,
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }