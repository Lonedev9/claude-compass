export interface IPersonalQuickAccessItem {
  Id: number;
  Title: string;
  Url: string;
  Icon: string;
  SortOrder: number;
  OwnerKey: string;
}

/** URL schemes allowed when saving or rendering a personal Quick Access link. */
export const ALLOWED_URL_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Validates a user-supplied URL against the allow-list of schemes.
 * Used both before saving to the list and again defensively before use in
 * any href / window.open — never trust a value just because it was already
 * stored (a direct list edit could bypass client-side validation).
 */
export function isSafeUrl(url: string): boolean {
  if (!url) {
    return false;
  }
  try {
    // Relative URLs (no scheme) are not valid for this field - require an explicit scheme.
    const parsed = new URL(url);
    return ALLOWED_URL_SCHEMES.indexOf(parsed.protocol.toLowerCase()) !== -1;
  } catch {
    return false;
  }
}

export const MAX_PERSONAL_QUICK_ACCESS_ITEMS = 5;
