import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface Restaurant {
    Name_EN: string;
    Name_TC: string;
    Address_EN: string;
    Address_TC: string;
    District_EN: string;
    District_TC: string;
    Latitude: number;
    Longitude: number;
    Keyword_EN: string[];
    Keyword_TC: string[];
    image?: string;  // 0ptional image path
}

@Injectable({ providedIn: 'root' })
export class RestaurantService {
    private demo: Restaurant[] = [
        {
            "Name_EN": "Three Virtues Vegetarian Restaurant",
            "Name_TC": "三德素食館",
            "Address_EN": "EAST WING, 1/F, 395 KING'S ROAD, NORTH POINT, HONG KONG",
            "Address_TC": "香港北角英皇道395號1樓東翼",
            "District_EN": "Eastern",
            "District_TC": "東區",
            "Latitude": 22.2912958,
            "Longitude": 114.1993903,
            "Keyword_EN": ["vegetarian"],
            "Keyword_TC": ["素食", "素食館"],
            image: 'assets/icon/Placeholder.png'
        },
        {
            "Name_EN": "妙法齋",
            "Name_TC": "妙法齋",
            "Address_EN": "G/F, 8 MING NGAI STREET, TUEN MUN, NEW TERRITORIES",
            "Address_TC": "新界屯門明藝街8號地下",
            "District_EN": "Tuen Mun",
            "District_TC": "屯門區",
            "Latitude": 22.3975735,
            "Longitude": 113.9748913,
            "Keyword_EN": [],
            "Keyword_TC": ["齋"],
            image: 'assets/icon/Placeholder.png'
        }
    ];

    getAll(): Observable<Restaurant[]> {
        return of(this.demo);
    }
}