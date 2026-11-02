const RULES = [
  ['housing', ['rent', 'mortgage', 'landlord', 'lease', 'apartment', 'housing', 'إيجار', 'سكن', 'عقار', 'شقة']],
  ['utilities', ['electricity', 'electric', 'power bill', 'water bill', 'utility', 'utilities', 'internet', 'wifi', 'wi fi', 'phone bill', 'mobile bill', 'gas bill', 'electric bill', 'الكهرباء', 'فاتورة الماء', 'ماء', 'إنترنت', 'انترنت', 'واي فاي', 'هاتف', 'اتصالات', 'غاز', 'مولدة', 'مولد', 'اشتراك المولدة', 'اشتراك مولدة', 'فاتورة']],
  ['transport', ['fuel', 'petrol', 'gas station', 'gasoline', 'uber', 'lyft', 'taxi', 'cab', 'bus', 'train', 'metro', 'subway', 'parking', 'toll', 'car repair', 'car wash', 'careem', 'بنزين', 'وقود', 'سيارة', 'تاكسي', 'مواصلات', 'حافلة', 'باص', 'قطار', 'مترو', 'موقف', 'أجرة', 'اجرة']],
  ['food', ['groceries', 'grocery', 'supermarket', 'market', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'food', 'meal', 'bakery', 'pizza', 'burger', 'takeaway', 'take out', 'delivery', 'talabat', 'hungerstation', 'كارفور', 'بقالة', 'مواد غذائية', 'طعام', 'مطعم', 'كافيه', 'مقهى', 'قهوة', 'غداء', 'عشاء', 'فطور', 'وجبة', 'مخبز', 'سوبرماركت', 'توصيل', 'طلبات']],
  ['health', ['pharmacy', 'chemist', 'doctor', 'dentist', 'clinic', 'hospital', 'medical', 'medicine', 'medication', 'health', 'prescription', 'صيدلية', 'طبيب', 'دكتور', 'طبيب أسنان', 'عيادة', 'مستشفى', 'صحة', 'علاج', 'دواء', 'دواء', 'تحاليل']],
  ['subscriptions', ['subscription', 'netflix', 'spotify', 'membership', 'streaming', 'icloud', 'cloud storage', 'monthly plan', 'اشتراك', 'نتفلكس', 'سبوتيفاي', 'عضوية']],
  ['education', ['school', 'course', 'tuition', 'textbook', 'bookstore', 'education', 'university', 'college', 'مدرسة', 'جامعة', 'دورة', 'رسوم دراسية', 'كتاب', 'تعليم', 'قرطاسية']],
  ['travel', ['flight', 'airfare', 'hotel', 'trip', 'vacation', 'airline', 'airbnb', 'booking.com', 'travel', 'سفر', 'رحلة', 'طيران', 'فندق', 'عطلة', 'حجز']],
  ['shopping', ['clothes', 'clothing', 'amazon', 'shopping', 'mall', 'purchase', 'shoes', 'electronics', 'clothing store', 'online order', 'retail', 'تسوق', 'ملابس', 'أحذية', 'متجر', 'شراء', 'إلكترونيات', 'الكترونيات']],
];

function normalizeDescription(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function inferCategory(description, kind = 'expense') {
  if (kind === 'saving') return 'savings';
  const normalized = ` ${normalizeDescription(description)} `;
  return RULES.find(([, keywords]) => keywords.some((word) => normalized.includes(` ${normalizeDescription(word)} `)))?.[0] ?? 'other';
}

export const CATEGORIES = ['housing', 'food', 'transport', 'utilities', 'health', 'shopping', 'subscriptions', 'education', 'travel', 'savings', 'other'];
