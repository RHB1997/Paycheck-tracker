// Local, deterministic scoring keeps descriptions on-device and lets specific
// items outweigh ambiguous merchant names (for example, "Uber Eats" is food).
const RULES = [
  ['housing', [
    ['rent', 'rent payment', 'mortgage', 'landlord', 'lease', 'apartment rent', 'house rent', 'إيجار', 'السكن', 'عقار', 'شقة'],
    ['housing', 'apartment', 'home maintenance', 'plumber', 'locksmith', 'maintenance', 'سكن', 'صيانة المنزل', 'سباك', 'قفل'],
  ]],
  ['utilities', [
    ['electricity bill', 'electric bill', 'power bill', 'water bill', 'internet bill', 'phone bill', 'mobile bill', 'gas bill', 'generator fee', 'generator subscription', 'اشتراك المولدة', 'اشتراك مولدة', 'أمبير المولدة', 'فاتورة الكهرباء', 'فاتورة الماء', 'فاتورة الانترنت', 'فاتورة الهاتف', 'مولدة', 'مولد'],
    ['electricity', 'electric', 'water', 'internet', 'wifi', 'wi fi', 'broadband', 'mobile', 'phone', 'utility', 'utilities', 'gas', 'generator', 'zain', 'asiacell', 'korek', 'earthlink', 'كهرباء', 'ماء', 'انترنت', 'واي فاي', 'هاتف', 'اتصالات', 'غاز', 'مولد', 'مولدة', 'أمبير', 'امبير', 'زين', 'اسياسيل', 'كورك', 'ايرثلنك'],
  ]],
  ['transport', [
    ['gas station', 'fuel station', 'car repair', 'car service', 'car wash', 'ride share', 'bus fare', 'train ticket', 'taxi ride', 'parking fee', 'موقف سيارات', 'محطة بنزين', 'تصليح السيارة', 'اجرة تكسي'],
    ['fuel', 'petrol', 'gasoline', 'diesel', 'uber', 'lyft', 'careem', 'taxi', 'cab', 'bus', 'train', 'metro', 'subway', 'parking', 'toll', 'car', 'vehicle', 'مواصلات', 'بنزين', 'وقود', 'ديزل', 'سيارة', 'تاكسي', 'تكسي', 'حافلة', 'باص', 'قطار', 'مترو', 'موقف', 'أجرة', 'اجرة', 'كريم'],
  ]],
  ['food', [
    ['uber eats', 'food delivery', 'grocery shopping', 'grocery store', 'fast food', 'coffee shop', 'restaurant bill', 'talabat', 'toters', 'lezzoo', 'alsaree3', 'hungerstation', 'كارفور', 'سوبر ماركت', 'مواد غذائية', 'مطعم', 'وجبة', 'طلبات', 'توتَرز', 'ليزو', 'السريع'],
    ['grocery', 'groceries', 'supermarket', 'market', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'food', 'meal', 'bakery', 'pizza', 'burger', 'takeaway', 'takeout', 'delivery', 'carrefour', 'bread', 'milk', 'produce', 'بقالة', 'مواد', 'طعام', 'مطعم', 'كافيه', 'مقهى', 'قهوة', 'غداء', 'عشاء', 'فطور', 'وجبة', 'مخبز', 'خبز', 'حليب', 'سوبرماركت', 'توصيل', 'طلبات'],
  ]],
  ['health', [
    ['doctor appointment', 'dentist appointment', 'medical appointment', 'prescription refill', 'health insurance', 'موعد طبيب', 'موعد طبيب اسنان', 'فاتورة المستشفى'],
    ['pharmacy', 'chemist', 'doctor', 'dentist', 'clinic', 'hospital', 'medical', 'medicine', 'medication', 'health', 'prescription', 'lab test', 'صيدلية', 'طبيب', 'دكتور', 'أسنان', 'عيادة', 'مستشفى', 'صحة', 'علاج', 'دواء', 'تحاليل', 'مختبر'],
  ]],
  ['subscriptions', [
    ['netflix', 'spotify', 'youtube premium', 'icloud', 'playstation plus', 'xbox game pass', 'amazon prime', 'اشتراك نتفلكس', 'اشتراك سبوتيفاي'],
    ['subscription', 'membership', 'streaming', 'monthly plan', 'premium', 'اشتراك', 'عضوية'],
  ]],
  ['education', [
    ['school fees', 'tuition fee', 'online course', 'university fees', 'رسوم دراسية', 'قسط المدرسة'],
    ['school', 'course', 'tuition', 'textbook', 'bookstore', 'education', 'university', 'college', 'stationery', 'مدرسة', 'جامعة', 'دورة', 'كتاب', 'تعليم', 'قرطاسية', 'دفاتر'],
  ]],
  ['travel', [
    ['flight ticket', 'plane ticket', 'hotel booking', 'airbnb', 'booking com', 'تذكرة طيران', 'حجز فندق'],
    ['flight', 'airfare', 'hotel', 'trip', 'vacation', 'airline', 'travel', 'سفر', 'رحلة', 'طيران', 'فندق', 'عطلة', 'حجز'],
  ]],
  ['shopping', [
    ['online order', 'clothing store', 'electronics store', 'shein', 'temu', 'noon', 'شراء ملابس', 'شراء احذية'],
    ['clothes', 'clothing', 'amazon', 'shopping', 'mall', 'purchase', 'shoes', 'electronics', 'retail', 'phone case', 'ملابس', 'أحذية', 'متجر', 'شراء', 'إلكترونيات', 'الكترونيات', 'تسوق'],
  ]],
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenForms(token) {
  const forms = new Set([token]);
  // Match common English plural endings and Arabic conjunction/preposition/article prefixes.
  if (token.length > 4 && token.endsWith('ies')) forms.add(`${token.slice(0, -3)}y`);
  else if (token.length > 4 && /(ches|shes|xes|zes)$/.test(token)) forms.add(token.slice(0, -2));
  else if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) forms.add(token.slice(0, -1));
  if (/^[\u0600-\u06FF]+$/u.test(token)) {
    for (const prefix of ['وال', 'بال', 'كال', 'لل', 'ال', 'و', 'ب', 'ل']) {
      if (token.startsWith(prefix) && token.length - prefix.length >= 3) forms.add(token.slice(prefix.length));
    }
  }
  return forms;
}

function containsTerm(description, term) {
  const words = description.split(' ');
  const termWords = normalize(term).split(' ');
  if (!termWords.length || !termWords[0]) return false;
  for (let start = 0; start <= words.length - termWords.length; start += 1) {
    const matches = termWords.every((termWord, offset) => {
      const actual = words[start + offset];
      return [...tokenForms(actual)].some((form) => form === termWord) || [...tokenForms(termWord)].includes(actual);
    });
    if (matches) return true;
  }
  return false;
}

export function inferCategory(description, kind = 'expense') {
  if (kind === 'saving') return 'savings';
  const normalized = normalize(description);
  if (!normalized) return 'other';
  let winner = 'other';
  let highestScore = 0;
  for (const [category, [specificTerms, commonTerms]] of RULES) {
    const specificMatches = specificTerms.filter((term) => containsTerm(normalized, term)).length;
    const commonMatches = commonTerms.filter((term) => containsTerm(normalized, term)).length;
    const score = specificMatches * 5 + commonMatches * 2;
    if (score > highestScore) {
      winner = category;
      highestScore = score;
    }
  }
  return winner;
}

export const CATEGORIES = ['housing', 'food', 'transport', 'utilities', 'health', 'shopping', 'subscriptions', 'education', 'travel', 'savings', 'other'];
