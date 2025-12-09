// Menu item field labels for bilingual display
// Used in store page for menu management

export interface MenuItemFieldLabel {
  EN: string;
  TC: string;
}

export interface MenuItemFieldLabels {
  Name_EN: MenuItemFieldLabel;
  Name_TC: MenuItemFieldLabel;
  Description_EN: MenuItemFieldLabel;
  Description_TC: MenuItemFieldLabel;
  price: MenuItemFieldLabel;
  image: MenuItemFieldLabel;
  imageUrl: MenuItemFieldLabel;
}

export const MenuItemFieldLabels: MenuItemFieldLabels = {
  Name_EN: { EN: 'Item Name (English)', TC: '菜品名稱（英文）' },
  Name_TC: { EN: 'Item Name (Chinese)', TC: '菜品名稱（中文）' },
  Description_EN: { EN: 'Item Description (English)', TC: '菜品描述（英文）' },
  Description_TC: { EN: 'Item Description (Chinese)', TC: '菜品描述（中文）' },
  price: { EN: 'Price', TC: '價格' },
  image: { EN: 'Item Image', TC: '菜品圖片' },
  imageUrl: { EN: 'Item Image', TC: '菜品圖片' }
};
