/// Centralized restaurant constants for districts, keywords, payment methods, and weekdays
/// Provides bilingual support (EN/TC) for consistent data across the application
// Districts in Hong Kong with bilingual support (18 official districts)
export interface District {
  en: string;
  tc: string;
}
export const Districts: District[] = [
  { en: 'Islands', tc: '離島' },
  { en: 'Kwai Tsing', tc: '葵青' },
  { en: 'North', tc: '北區' },
  { en: 'Sai Kung', tc: '西貢' },
  { en: 'Sha Tin', tc: '沙田' },
  { en: 'Tai Po', tc: '大埔' },
  { en: 'Tsuen Wan', tc: '荃灣' },
  { en: 'Tuen Mun', tc: '屯門' },
  { en: 'Yuen Long', tc: '元朗' },
  { en: 'Kowloon City', tc: '九龍城' },
  { en: 'Kwun Tong', tc: '觀塘' },
  { en: 'Sham Shui Po', tc: '深水埗' },
  { en: 'Wong Tai Sin', tc: '黃大仙' },
  { en: 'Yau Tsim Mong', tc: '油尖旺區' },
  { en: 'Central/Western', tc: '中西區' },
  { en: 'Eastern', tc: '東區' },
  { en: 'Southern', tc: '南區' },
  { en: 'Wan Chai', tc: '灣仔' }
];

// Keywords for restaurant categories with bilingual support
// Focused on vegan, plant-based, and religious dietary preferences
export interface Keyword {
  en: string;
  tc: string;
}
export const Keywords: Keyword[] = [
  // Core vegan/plant-based categories
  { en: 'Vegan', tc: '純素' },
  { en: 'Vegetarian', tc: '素食' },
  { en: 'Plant-Based', tc: '植物性' },
  { en: 'Organic', tc: '有機' },
  { en: 'Farm-to-Table', tc: '農場直送' },
  { en: 'Sustainable', tc: '可持續' },
  { en: 'Eco-Friendly', tc: '環保' },
  { en: 'Whole Foods', tc: '全食物' },
  { en: 'Raw Vegan', tc: '生機素食' },
  { en: 'Macrobiotic', tc: '長壽飲食' },

  // Religious dietary preferences
  { en: 'Buddhism', tc: '佛教' },
  { en: 'Buddhist Vegetarian', tc: '齋' },
  { en: 'Muslim', tc: '穆斯林' },
  { en: 'Halal', tc: '清真' },
  { en: 'Kosher', tc: '猶太潔食' },
  { en: 'Jain', tc: '耆那教' },
  { en: 'Hindu', tc: '印度教' },
  { en: 'Taoist', tc: '道教' },

  // Cuisine types
  { en: 'Asian', tc: '亞洲菜' },
  { en: 'Chinese', tc: '中菜' },
  { en: 'Japanese', tc: '日本菜' },
  { en: 'Korean', tc: '韓國菜' },
  { en: 'Thai', tc: '泰國菜' },
  { en: 'Vietnamese', tc: '越南菜' },
  { en: 'Indian', tc: '印度菜' },
  { en: 'Italian', tc: '意大利菜' },
  { en: 'Mediterranean', tc: '地中海菜' },
  { en: 'Mexican', tc: '墨西哥菜' },
  { en: 'Middle Eastern', tc: '中東菜' },
  { en: 'Western', tc: '西式' },
  { en: 'Fusion', tc: '融合菜' },
  { en: 'International', tc: '國際菜' },

  // Restaurant types
  { en: 'Fine Dining', tc: '高級餐廳' },
  { en: 'Casual Dining', tc: '休閒餐廳' },
  { en: 'Fast Casual', tc: '快餐店' },
  { en: 'Cafe', tc: '咖啡廳' },
  { en: 'Bistro', tc: '小酒館' },
  { en: 'Buffet', tc: '自助餐' },
  { en: 'Food Court', tc: '美食廣場' },
  { en: 'Takeaway', tc: '外賣' },
  { en: 'Delivery', tc: '送餐' },

  // Meal types
  { en: 'Breakfast', tc: '早餐' },
  { en: 'Brunch', tc: '早午餐' },
  { en: 'Lunch', tc: '午餐' },
  { en: 'Dinner', tc: '晚餐' },
  { en: 'All-Day Dining', tc: '全日餐飲' },

  // Dietary features
  { en: 'Gluten-Free', tc: '無麩質' },
  { en: 'Soy-Free', tc: '無大豆' },
  { en: 'Nut-Free', tc: '無堅果' },
  { en: 'Sugar-Free', tc: '無糖' },
  { en: 'Oil-Free', tc: '無油' },
  { en: 'Low-Carb', tc: '低碳水' },
  { en: 'High-Protein', tc: '高蛋白' },
  { en: 'Keto-Friendly', tc: '生酮友善' },

  // Specialty items
  { en: 'Smoothie Bowls', tc: '冰沙碗' },
  { en: 'Juices', tc: '果汁' },
  { en: 'Coffee', tc: '咖啡' },
  { en: 'Tea', tc: '茶' },
  { en: 'Desserts', tc: '甜品' },
  { en: 'Bakery', tc: '麵包店' },
  { en: 'Noodles', tc: '麵食' },
  { en: 'Rice Bowls', tc: '飯類' },
  { en: 'Salads', tc: '沙律' },
  { en: 'Soups', tc: '湯類' },
  { en: 'Burgers', tc: '漢堡' },
  { en: 'Pizza', tc: '披薩' },
  { en: 'Pasta', tc: '意粉' },
  { en: 'Tacos', tc: '墨西哥捲餅' },
  { en: 'Sushi', tc: '壽司' },
  { en: 'Ramen', tc: '拉麵' },
  { en: 'Dumplings', tc: '餃子' },
  { en: 'Dim Sum', tc: '點心' },
  { en: 'Hot Pot', tc: '火鍋' },

  // Ambiance/features
  { en: 'Pet-Friendly', tc: '寵物友善' },
  { en: 'Kid-Friendly', tc: '兒童友善' },
  { en: 'Romantic', tc: '浪漫' },
  { en: 'Business', tc: '商務' },
  { en: 'Casual', tc: '休閒' },
  { en: 'Cozy', tc: '舒適' },
  { en: 'Modern', tc: '現代' },
  { en: 'Traditional', tc: '傳統' },
  { en: 'Rooftop', tc: '天台' },
  { en: 'Waterfront', tc: '海濱' },
  { en: 'Garden', tc: '花園' },
  { en: 'Outdoor Seating', tc: '戶外座位' },
  { en: 'Private Room', tc: '私人房間' },
  { en: 'Bar', tc: '酒吧' },
  { en: 'Live Music', tc: '現場音樂' },
  { en: 'Wi-Fi', tc: 'Wi-Fi' },
  { en: 'Air-Conditioned', tc: '室內冷氣' }
];

// Payment methods with bilingual support
export interface PaymentMethod {
  en: string;
  tc: string;
}

export const PaymentMethods: PaymentMethod[] = [
  { en: 'Cash', tc: '現金' },
  { en: 'Credit Card', tc: '信用卡' },
  { en: 'Debit Card', tc: '扣賬卡' },
  { en: 'Octopus', tc: '八達通' },
  { en: 'AliPay HK', tc: '支付寶香港' },
  { en: 'WeChat Pay HK', tc: '微信支付香港' },
  { en: 'PayMe', tc: 'PayMe' },
  { en: 'FPS', tc: '轉數快' },
  { en: 'Apple Pay', tc: 'Apple Pay' },
  { en: 'Google Pay', tc: 'Google Pay' }
];

// Weekdays with bilingual support
export interface Weekday {
  en: string;
  tc: string;
}

export const Weekdays: Weekday[] = [
  { en: 'Monday', tc: '星期一' },
  { en: 'Tuesday', tc: '星期二' },
  { en: 'Wednesday', tc: '星期三' },
  { en: 'Thursday', tc: '星期四' },
  { en: 'Friday', tc: '星期五' },
  { en: 'Saturday', tc: '星期六' },
  { en: 'Sunday', tc: '星期日' }
];

// Helper functions to get district/keyword by name
export function getDistrictByEN(enName: string): District | undefined {
  return Districts.find(d => d.en === enName);
}
export function getDistrictByTC(tcName: string): District | undefined {
  return Districts.find(d => d.tc === tcName);
}
export function getKeywordByEN(enName: string): Keyword | undefined {
  return Keywords.find(k => k.en === enName);
}
export function getKeywordByTC(tcName: string): Keyword | undefined {
  return Keywords.find(k => k.tc === tcName);
}
export function getPaymentMethodByEN(enName: string): PaymentMethod | undefined {
  return PaymentMethods.find(p => p.en === enName);
}
export function getPaymentMethodByTC(tcName: string): PaymentMethod | undefined {
  return PaymentMethods.find(p => p.tc === tcName);
}
export function getWeekdayByEN(enName: string): Weekday | undefined {
  return Weekdays.find(w => w.en === enName);
}
export function getWeekdayByTC(tcName: string): Weekday | undefined {
  return Weekdays.find(w => w.tc === tcName);
}

// Get sorted lists for dropdowns
export function getDistrictOptions(lang: 'EN' | 'TC'): string[] {
  return Districts.map(d => lang === 'TC' ? d.tc : d.en).sort();
}
export function getKeywordOptions(lang: 'EN' | 'TC'): string[] {
  return Keywords.map(k => lang === 'TC' ? k.tc : k.en).sort();
}
export function getPaymentMethodOptions(lang: 'EN' | 'TC'): string[] {
  return PaymentMethods.map(p => lang === 'TC' ? p.tc : p.en);
}
export function getWeekdayOptions(lang: 'EN' | 'TC'): string[] {
  return Weekdays.map(w => lang === 'TC' ? w.tc : w.en);
}