const COUNTRY_LANGUAGE_OVERRIDES: Record<string, string> = {
  china: 'Chinese',
  'hong kong': 'Chinese',
  taiwan: 'Chinese',
  japan: 'Japanese',
  'south korea': 'Korean',
  korea: 'Korean',
  france: 'French',
  germany: 'German',
  austria: 'German',
  switzerland: 'German',
  spain: 'Spanish',
  mexico: 'Spanish',
  colombia: 'Spanish',
  argentina: 'Spanish',
  chile: 'Spanish',
  peru: 'Spanish',
  portugal: 'Portuguese',
  brazil: 'Portuguese',
  italy: 'Italian',
  russia: 'Russian',
  ukraine: 'Ukrainian',
  turkey: 'Turkish',
  vietnam: 'Vietnamese',
  thailand: 'Thai',
  indonesia: 'Indonesian',
  malaysia: 'Malay',
  india: 'Hindi or English',
  pakistan: 'Urdu or English',
  bangladesh: 'Bengali',
  'saudi arabia': 'Arabic',
  'united arab emirates': 'Arabic',
  egypt: 'Arabic',
  morocco: 'Arabic',
  netherlands: 'Dutch',
  belgium: 'Dutch or French',
  poland: 'Polish',
  'czechia (czech republic)': 'Czech',
  czechia: 'Czech',
  romania: 'Romanian',
  greece: 'Greek',
  israel: 'Hebrew',
  iran: 'Persian',
  'united states': 'English',
  usa: 'English',
  canada: 'English',
  'united kingdom': 'English',
  australia: 'English',
  'new zealand': 'English',
  singapore: 'English'
};

export function getSystemLanguageName(language?: 'en' | 'zh' | string) {
  const normalized = String(language || '').trim().toLowerCase();
  return ['zh', 'zh-cn', 'cn', 'chinese', '中文', '简体中文'].includes(normalized) ? 'Chinese' : 'English';
}

export function inferCommunicationLanguage(text?: string | null) {
  const sample = (text || '').trim();
  if (!sample) return '';
  if (/[\u4e00-\u9fff]/.test(sample)) return 'Chinese';
  if (/[\u3040-\u30ff]/.test(sample)) return 'Japanese';
  if (/[\uac00-\ud7af]/.test(sample)) return 'Korean';
  if (/[\u0400-\u04ff]/.test(sample)) return 'Russian or Ukrainian';
  if (/[\u0600-\u06ff]/.test(sample)) return 'Arabic';
  if (/[¿¡ñáéíóúü]/i.test(sample)) return 'Spanish';
  if (/[àâçéèêëîïôùûüÿœ]/i.test(sample)) return 'French';
  if (/[äöüß]/i.test(sample)) return 'German';
  if (/[ãõç]/i.test(sample)) return 'Portuguese';
  return '';
}

export function getOutboundLanguage(preferredLanguage?: string, country?: string) {
  const preferred = preferredLanguage?.trim();
  if (preferred) return preferred;
  const normalizedCountry = country?.trim().toLowerCase();
  if (!normalizedCountry) return 'English';
  return COUNTRY_LANGUAGE_OVERRIDES[normalizedCountry] || 'English';
}

export function getCustomerOutputLanguage(input: {
  lastCommunicationLanguage?: string | null;
  lastCommunicationText?: string | null;
  preferredLanguage?: string | null;
  country?: string | null;
}) {
  const explicitLastLanguage = input.lastCommunicationLanguage?.trim();
  if (explicitLastLanguage) return explicitLastLanguage;
  const inferredLastLanguage = inferCommunicationLanguage(input.lastCommunicationText);
  if (inferredLastLanguage) return inferredLastLanguage;
  return getOutboundLanguage(input.preferredLanguage || undefined, input.country || undefined);
}

export function buildLanguagePolicy(input: {
  systemLanguage?: 'en' | 'zh' | string;
  customerLanguage?: string;
}) {
  const internalLanguage = getSystemLanguageName(input.systemLanguage);
  const customerLanguage = input.customerLanguage || 'the customer language resolved by policy';
  return [
    `Internal-facing output for CRM users MUST be written in ${internalLanguage}.`,
    `Customer-facing output such as email, WhatsApp, quotes, proposal text, and externally visible notes MUST be written in ${customerLanguage}.`,
    'Customer-facing language priority is: last communication language > client preferred language > official language of client country/region > English.'
  ].join('\n');
}
