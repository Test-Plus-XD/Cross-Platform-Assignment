import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';

interface OfferContent {
  icon: string;
  eyebrow_EN: string;
  eyebrow_TC: string;
  title_EN: string;
  title_TC: string;
  description_EN: string;
  description_TC: string;
  terms_EN: string;
  terms_TC: string;
  route: string;
  action_EN: string;
  action_TC: string;
}

@Component({
  selector: 'app-offers',
  templateUrl: './offers.page.html',
  styleUrls: ['./offers.page.scss'],
  standalone: false,
})
export class OffersPage {
  private readonly languageService = inject(LanguageService);

  public readonly lang$ = this.languageService.lang$;

  public readonly featuredOffers: OfferContent[] = [
    {
      icon: 'leaf-outline',
      eyebrow_EN: 'Lunch Set',
      eyebrow_TC: '午市套餐',
      title_EN: 'Green lunch from HK$88',
      title_TC: 'HK$88 起綠色午餐',
      description_EN: 'Selected weekday lunch sets include a plant-based main, soup, and house tea at participating vegetarian restaurants.',
      description_TC: '指定平日午市套餐包括植物主菜、例湯及餐茶，適用於參與的素食餐廳。',
      terms_EN: 'Available Monday to Friday before 14:30. Limited seats may apply.',
      terms_TC: '星期一至五 14:30 前供應，座位名額有限。',
      route: '/restaurants',
      action_EN: 'Find restaurants',
      action_TC: '尋找餐廳'
    },
    {
      icon: 'restaurant-outline',
      eyebrow_EN: 'Sharing Menu',
      eyebrow_TC: '共享餐單',
      title_EN: 'Weekend dim sum tasting',
      title_TC: '週末素點心嚐味餐',
      description_EN: 'Book ahead for a two-person dim sum board with seasonal dumplings, steamed buns, and a dessert pairing.',
      description_TC: '提前訂座可享二人素點心拼盤，包括時令餃子、蒸包及甜品配搭。',
      terms_EN: 'Advance booking recommended. Offer varies by restaurant.',
      terms_TC: '建議提前預約，優惠內容因餐廳而異。',
      route: '/booking',
      action_EN: 'View bookings',
      action_TC: '查看預約'
    },
    {
      icon: 'sparkles-outline',
      eyebrow_EN: 'Dinner Upgrade',
      eyebrow_TC: '晚市升級',
      title_EN: 'Complimentary seasonal drink',
      title_TC: '送時令特飲一杯',
      description_EN: 'Reserve dinner through PourRice and ask participating restaurants about their rotating seasonal drink upgrade.',
      description_TC: '透過 PourRice 預約晚餐後，可向參與餐廳查詢輪換時令特飲升級。',
      terms_EN: 'One drink per diner while daily stock lasts.',
      terms_TC: '每位食客限享一杯，每日售完即止。',
      route: '/restaurants',
      action_EN: 'Browse dinner spots',
      action_TC: '瀏覽晚餐餐廳'
    },
  ];

  public readonly tips = [
    {
      icon: 'calendar-outline',
      text_EN: 'Book earlier for small vegan tasting menus, especially Friday to Sunday.',
      text_TC: '細型純素嚐味餐於星期五至日較快滿座，建議提早預約。'
    },
    {
      icon: 'card-outline',
      text_EN: 'Check payment tags before visiting if you rely on Octopus, FPS, or mobile wallets.',
      text_TC: '如需要使用八達通、轉數快或電子錢包，出發前先查看付款標籤。'
    },
    {
      icon: 'location-outline',
      text_EN: 'Use Near Me on the restaurant search page to spot nearby offers after class or work.',
      text_TC: '放學或下班後可在餐廳搜尋頁使用「附近」尋找鄰近優惠。'
    },
  ];
}
