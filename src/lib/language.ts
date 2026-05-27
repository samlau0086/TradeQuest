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

export function getOutboundLanguage(preferredLanguage?: string, country?: string) {
  const preferred = preferredLanguage?.trim();
  if (preferred) return preferred;
  const normalizedCountry = country?.trim().toLowerCase();
  if (!normalizedCountry) return 'English';
  return COUNTRY_LANGUAGE_OVERRIDES[normalizedCountry] || 'English';
}
