export type Restaurant = {
  id: number;
  name: string;
  address: string;
  description: string | null;
  thumbnail_url: string | null;
  lat: number | null;
  lng: number | null;
  created_by?: string | null;
  created_at: string;
   category: string | null;
  main_menu: string | null;
  features: string | null;
  phone: string | null;
  gallery_urls: string[] | null;
    map_url?: string | null; // ✅ 이거 추가

};

export type Review = {
  id: number;
  restaurant_id: number;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  photo_urls: string[] | null;

};