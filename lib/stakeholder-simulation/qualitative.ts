/** Shared authoritative runtime rule; provider schemas intentionally avoid prose regex constraints. */
export const QUANTITATIVE_DIALOGUE=/\d[\d.,]*\s*(?:%|percent\b)|[$\u00a3\u20ac]\s*\d|\d[\d,]*\s+(?:jobs|workers|households|residents|people)\b/i;
