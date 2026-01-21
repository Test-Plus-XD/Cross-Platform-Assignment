// MockDataService provides demo data for offers, articles, reviews and restaurants.
// It returns Observables so templates can use the async pipe directly.
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Offer { id: string; title: string; restaurant: string; image?: string; }
export interface Article { id: string; title_EN: string; title_TC: string; excerpt_EN: string; excerpt_TC: string; image?: string; }
export interface Review { id: string; name: string; avatar?: string; meta: string; text: string; rating: number; }
export interface Restaurant {
  id: string;
  Name_EN: string;
  Name_TC: string;
  Address_EN: string;
  Address_TC: string;
  image?: string;
  Keyword_EN?: string[];
  Keyword_TC?: string[];
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly placeholderImage = environment.placeholderImageUrl || 'assets/icon/Placeholder.png';

  // Four sample offers with restaurant names and placeholder images
  private OFFERS: Offer[] = [
    { id: 'o1', title: '50% off lunch set', restaurant: 'Three Virtues Vegetarian', image: this.placeholderImage },
    { id: 'o2', title: 'Buy 1 Get 1 noodles', restaurant: '妙法齋', image: this.placeholderImage },
    { id: 'o3', title: 'Weekend bento deal', restaurant: 'Green Harmony', image: this.placeholderImage },
    { id: 'o4', title: 'Student discount 20%', restaurant: 'Veggie Corner', image: this.placeholderImage }
  ];

  // Four sample bilingual articles
  private ARTICLES: Article[] = [
    {
      id: 'a1',
      title_EN: '5 Vegetarian Picks', title_TC: '五大素食推介',
      excerpt_EN: 'Short guide to local vegetarian must-trys.',
      excerpt_TC: '本地素食必試小指南。',
      image: this.placeholderImage
    },
    {
      id: 'a2',
      title_EN: 'Herb secrets', title_TC: '香草秘籍',
      excerpt_EN: 'How aroma changes a dish.',
      excerpt_TC: '香氣如何改變一道菜。', image: this.placeholderImage
    },
    {
      id: 'a3',
      title_EN: 'Street food finds', title_TC: '街頭小吃發現',
      excerpt_EN: 'Hidden gems near the harbour.',
      excerpt_TC: '海旁隱藏美食小店。', image: this.placeholderImage
    },
    {
      id: 'a4',
      title_EN: 'Tea pairing tips', title_TC: '配茶小貼士',
      excerpt_EN: 'Pairing tea with vegetarian food.',
      excerpt_TC: '素食與茶的配搭技巧。', image: this.placeholderImage
    }
  ];

  // Four sample reviews/testimonials
  private REVIEWS: Review[] = [
    { id: 'r1', name: 'Alex', avatar: this.placeholderImage, meta: 'Three Virtues · 2 days ago', text: 'A terrific piece of praise.', rating: 4.5 },
    { id: 'r2', name: 'May', avatar: this.placeholderImage, meta: 'Tuen Mun · last week', text: 'A fantastic bit of feedback.', rating: 4.2 },
    { id: 'r3', name: 'Chen', avatar: this.placeholderImage, meta: 'Central · yesterday', text: 'A genuinely glowing review.', rating: 4.8 },
    { id: 'r4', name: 'Jia', avatar: this.placeholderImage, meta: 'Kowloon · 3 days ago', text: 'Friendly staff and tasty food.', rating: 4.0 }
  ];

  // Four sample restaurants with bilingual fields and keywords
  private RESTAURANTS: Restaurant[] = [
    {
      id: 'rest1',
      Name_EN: 'Three Virtues Vegetarian Restaurant',
      Name_TC: '三德素食館',
      Address_EN: "EAST WING, 1/F, 395 KING'S ROAD, NORTH POINT, HONG KONG",
      Address_TC: '香港北角英皇道395號1樓東翼',
      image: this.placeholderImage,
      Keyword_EN: ['vegetarian'], Keyword_TC: ['素食', '素食館']
    },
    {
      id: 'rest2',
      Name_EN: '妙法齋',
      Name_TC: '妙法齋',
      Address_EN: 'G/F, 8 MING NGAI STREET, TUEN MUN, NEW TERRITORIES',
      Address_TC: '新界屯門明藝街8號地下',
      image: this.placeholderImage,
      Keyword_EN: [], Keyword_TC: ['齋']
    },
    {
      id: 'rest3',
      Name_EN: 'Green Harmony',
      Name_TC: '綠和',
      Address_EN: '12 Garden Road, Central',
      Address_TC: '中環花園道12號',
      image: this.placeholderImage,
      Keyword_EN: ['healthy', 'salads'], Keyword_TC: ['健康', '沙律']
    },
    {
      id: 'rest4',
      Name_EN: 'Veggie Corner',
      Name_TC: '素角落',
      Address_EN: '88 Peace Avenue, Kowloon',
      Address_TC: '九龍和安道88號',
      image: this.placeholderImage,
      Keyword_EN: ['cheap', 'fast'], Keyword_TC: ['平價', '快餐']
    }
  ];

  // Ads sample
  private ADS = [
    { id: 'ad1', href: '#', image: this.placeholderImage },
    { id: 'ad2', href: '#', image: this.placeholderImage },
    { id: 'ad3', href: '#', image: this.placeholderImage },
    { id: 'ad4', href: '#', image: this.placeholderImage },
    { id: 'ad5', href: '#', image: this.placeholderImage },
    { id: 'ad6', href: '#', image: this.placeholderImage },
    { id: 'ad7', href: '#', image: this.placeholderImage },
    { id: 'ad8', href: '#', image: this.placeholderImage }
  ];

  // Public accessors returning Observables
  offers$(): Observable<Offer[]> { return of(this.OFFERS); }
  articles$(): Observable<Article[]> { return of(this.ARTICLES); }
  reviews$(): Observable<Review[]> { return of(this.REVIEWS); }
  restaurants$(): Observable<Restaurant[]> { return of(this.RESTAURANTS); }
  ads$(): Observable<any[]> { return of(this.ADS); }

  // Get a restaurant by id
  getRestaurant(id: string): Observable<Restaurant | undefined> {
    const found = this.RESTAURANTS.find(r => r.id === id);
    return of(found);
  }
}