import { Component, inject } from '@angular/core';
import { LanguageService } from '../../services/language.service';

interface ArticleContent {
  icon: string;
  category_EN: string;
  category_TC: string;
  title_EN: string;
  title_TC: string;
  excerpt_EN: string;
  excerpt_TC: string;
  readTime_EN: string;
  readTime_TC: string;
}

@Component({
  selector: 'app-articles',
  templateUrl: './articles.page.html',
  styleUrls: ['./articles.page.scss'],
  standalone: false,
})
export class ArticlesPage {
  private readonly languageService = inject(LanguageService);

  public readonly lang$ = this.languageService.lang$;

  public readonly leadArticle: ArticleContent = {
    icon: 'book-outline',
    category_EN: 'Neighbourhood Guide',
    category_TC: '地區指南',
    title_EN: "A diner's route through plant-based Mong Kok",
    title_TC: '旺角植物系用餐路線',
    excerpt_EN: 'From quick noodle counters to quieter tea-led dinners, Mong Kok works best when you filter by opening status before heading out.',
    excerpt_TC: '由快捷粉麵小店到茶餐配搭晚餐，出發前按營業狀態篩選，會更容易安排旺角素食路線。',
    readTime_EN: '5 min read',
    readTime_TC: '閱讀約 5 分鐘'
  };

  public readonly articles: ArticleContent[] = [
    {
      icon: 'nutrition-outline',
      category_EN: 'Menu Notes',
      category_TC: '餐單札記',
      title_EN: 'How to read Buddhist vegetarian menus',
      title_TC: '如何閱讀佛教素食餐單',
      excerpt_EN: 'A short primer on common menu terms, mock-meat dishes, allium-free requests, and how to confirm ingredients before booking.',
      excerpt_TC: '簡介常見餐單用語、仿葷菜式、五辛要求，以及訂座前確認食材的方法。',
      readTime_EN: '4 min read',
      readTime_TC: '閱讀約 4 分鐘'
    },
    {
      icon: 'time-outline',
      category_EN: 'Booking Tips',
      category_TC: '訂座貼士',
      title_EN: 'When to book small vegetarian kitchens',
      title_TC: '細型素食廚房何時訂座最好',
      excerpt_EN: 'Compact dining rooms often run tighter seatings. Check opening hours, book earlier, and use special requests clearly.',
      excerpt_TC: '小型餐廳座位輪轉較緊密，宜先查看營業時間、提早訂座，並清楚填寫特別要求。',
      readTime_EN: '3 min read',
      readTime_TC: '閱讀約 3 分鐘'
    },
    {
      icon: 'wallet-outline',
      category_EN: 'Practical Guide',
      category_TC: '實用指南',
      title_EN: 'Payment habits for meat-free dining',
      title_TC: '素食用餐付款習慣',
      excerpt_EN: 'Cash is still useful, but many diner-friendly spots now support Octopus, FPS, PayMe, and credit cards.',
      excerpt_TC: '現金仍然有用，但不少方便食客的餐廳已支援八達通、轉數快、PayMe 及信用卡。',
      readTime_EN: '4 min read',
      readTime_TC: '閱讀約 4 分鐘'
    },
  ];
}
