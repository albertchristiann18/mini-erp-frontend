export interface MasterCategory {
  key: string
  label: string
  shopee_id: number
  tiktok_id: string
}

export const MASTER_CATEGORIES: MasterCategory[] = [
  { key: "tops", label: "Tops", shopee_id: 100648, tiktok_id: "601327" },
  { key: "bottoms", label: "Bottoms", shopee_id: 100649, tiktok_id: "601328" },
  { key: "dresses_skirts", label: "Dresses & Skirts", shopee_id: 100650, tiktok_id: "601329" },
  { key: "outerwear", label: "Outerwear", shopee_id: 100651, tiktok_id: "601330" },
  { key: "underwear_innerwear", label: "Underwear & Innerwear", shopee_id: 100642, tiktok_id: "601321" },
  { key: "sleepwear_pajamas", label: "Sleepwear & Pajamas", shopee_id: 100643, tiktok_id: "601322" },
  { key: "sportswear", label: "Sportswear", shopee_id: 100641, tiktok_id: "601320" },
  { key: "traditional_ethnic_wear", label: "Traditional/Ethnic Wear", shopee_id: 100644, tiktok_id: "601323" },
  { key: "uniforms", label: "Uniforms", shopee_id: 100645, tiktok_id: "601324" },
  { key: "fabric_materials", label: "Fabric & Materials", shopee_id: 100646, tiktok_id: "601325" },
  { key: "sewing_supplies", label: "Sewing Supplies", shopee_id: 100647, tiktok_id: "601326" },
  { key: "women_clothing", label: "Women's Clothing", shopee_id: 100632, tiktok_id: "601310" },
  { key: "men_clothing", label: "Men's Clothing", shopee_id: 100633, tiktok_id: "601311" },
  { key: "kids_clothing", label: "Kids Clothing", shopee_id: 100634, tiktok_id: "601312" },
  { key: "baby_clothing", label: "Baby Clothing", shopee_id: 100634, tiktok_id: "601313" },
  { key: "women_shoes", label: "Women's Shoes", shopee_id: 100635, tiktok_id: "601314" },
  { key: "men_shoes", label: "Men's Shoes", shopee_id: 100636, tiktok_id: "601315" },
  { key: "women_bags", label: "Women's Bags", shopee_id: 100637, tiktok_id: "601316" },
  { key: "men_bags", label: "Men's Bags", shopee_id: 100638, tiktok_id: "601317" },
  { key: "fashion_accessories", label: "Fashion Accessories", shopee_id: 100639, tiktok_id: "601318" },
  { key: "jewelry_watches", label: "Jewelry & Watches", shopee_id: 100640, tiktok_id: "601319" },
]

export const getMasterCategoryLabel = (key: string): string => {
  const found = MASTER_CATEGORIES.find(c => c.key === key)
  return found?.label ?? key
}