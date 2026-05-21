/**
 * Maps a listing_category enum value to a tinted background + accent text
 * color, used by the card brand-blocks and detail headers.
 *
 * Falls back to a neutral blue for 'other' or unknown categories.
 */

export type CategoryColorScheme = { bg: string; text: string };

const SCHEME: Record<string, CategoryColorScheme> = {
  food_beverage:        { bg: '#B5D4F4', text: '#185FA5' },
  fitness_wellness:     { bg: '#9FE1CB', text: '#0F6E56' },
  home_services:        { bg: '#D3D1C7', text: '#5F5E5A' },
  beauty_personal_care: { bg: '#F4C0D1', text: '#993556' },
  automotive:           { bg: '#D3D1C7', text: '#5F5E5A' },
  retail:               { bg: '#FAC775', text: '#854F0B' },
  business_services:    { bg: '#D3D1C7', text: '#5F5E5A' },
  education_childcare:  { bg: '#FAC775', text: '#854F0B' },
  health_medical:       { bg: '#F4C0D1', text: '#993556' },
  real_estate:          { bg: '#B5D4F4', text: '#185FA5' },
  other:                { bg: '#E6F1FB', text: '#185FA5' },
};

export function categoryColors(c: string | null | undefined): CategoryColorScheme {
  if (!c) return SCHEME.other;
  return SCHEME[c] ?? SCHEME.other;
}

/** 2-letter initials from a brand name, for the brand-block. */
export function brandInitials(name: string | null | undefined): string {
  if (!name) return '??';
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
