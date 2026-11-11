// Instagoon Monetization Offers: Progressive Chained FOMO (Cliffhanger -> VIP -> Whale)

export const CLIFFHANGER_OFFER = {
  sku: 'offer_cliffhanger_49',
  name: 'แพ็กอยู่ต่อกับเธอ (Cliffhanger Special)',
  priceSatang: 4900,
  priceThb: 49,
  originalPriceThb: 120,
  discountPercent: 59,
  valueMultiplier: '+300%',
  energy: 180,
  diamonds: 20,
  expiresInSeconds: 600
};

export const CASCADE_VIP_OFFER = {
  sku: 'offer_cascade_99',
  name: 'สิทธิ์ลับเฉพาะคนพิเศษ (VIP Cascade Special)',
  priceSatang: 9900,
  priceThb: 99,
  originalPriceThb: 350,
  discountPercent: 72,
  valueMultiplier: '+1,000%',
  energy: 650,
  diamonds: 80,
  bonusReward: 'ปลดล็อกภาพลับ Secret Drop 1 รูป',
  expiresInSeconds: 600
};

export const CASCADE_WHALE_OFFER = {
  sku: 'offer_cascade_299',
  name: 'บัตรผ่านห้องลับ Super VIP (Whale Special)',
  priceSatang: 29900,
  priceThb: 299,
  originalPriceThb: 1200,
  discountPercent: 75,
  valueMultiplier: '+3,000%',
  energy: 2400,
  diamonds: 300,
  bonusReward: 'ปลดล็อกอัลบั้มลับ Uncensored 5 รูป + สิทธิ์คุยยาวตลอดสัปดาห์',
  expiresInSeconds: 900
};

export function getCascadeOfferForPaidSku(sku) {
  if (sku === 'offer_cliffhanger_49' || sku === 'energy_39') {
    return CASCADE_VIP_OFFER;
  }
  if (sku === 'offer_cascade_99' || sku === 'energy_99') {
    return CASCADE_WHALE_OFFER;
  }
  return null;
}
