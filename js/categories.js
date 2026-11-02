const RULES = [
  ['housing', ['rent', 'mortgage', 'landlord', 'lease', 'إيجار', 'سكن', 'عقار']],
  ['utilities', ['electricity', 'utility', 'utilities', 'water bill', 'internet', 'phone bill', 'الكهرباء', 'فاتورة الماء', 'إنترنت', 'انترنت', 'هاتف', 'اتصالات']],
  ['transport', ['fuel', 'petrol', 'gas station', 'uber', 'taxi', 'bus', 'train', 'parking', 'car', 'بنزين', 'وقود', 'سيارة', 'تاكسي', 'مواصلات', 'حافلة', 'موقف']],
  ['food', ['groceries', 'grocery', 'supermarket', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'food', 'delivery', 'بقالة', 'طعام', 'مطعم', 'قهوة', 'غداء', 'عشاء', 'سوبرماركت', 'توصيل']],
  ['health', ['pharmacy', 'doctor', 'hospital', 'medical', 'health', 'صيدلية', 'طبيب', 'مستشفى', 'صحة', 'علاج', 'دواء']],
  ['shopping', ['clothes', 'clothing', 'amazon', 'shopping', 'mall', 'purchase', 'تسوق', 'ملابس', 'متجر', 'شراء']],
  ['subscriptions', ['subscription', 'netflix', 'spotify', 'membership', 'streaming', 'اشتراك', 'نتفلكس', 'سبوتيفاي']],
  ['education', ['school', 'course', 'tuition', 'book', 'education', 'مدرسة', 'دورة', 'رسوم دراسية', 'كتاب', 'تعليم']],
  ['travel', ['flight', 'hotel', 'trip', 'vacation', 'airline', 'سفر', 'رحلة', 'طيران', 'فندق', 'عطلة']],
];

export function inferCategory(description, kind = 'expense') {
  if (kind === 'saving') return 'savings';
  const normalized = String(description ?? '').toLocaleLowerCase();
  return RULES.find(([, keywords]) => keywords.some((word) => normalized.includes(word)))?.[0] ?? 'other';
}

export const CATEGORIES = ['housing', 'food', 'transport', 'utilities', 'health', 'shopping', 'subscriptions', 'education', 'travel', 'savings', 'other'];
