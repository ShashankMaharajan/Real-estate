const CRORE = 10_000_000;
const LAKH = 100_000;
const SQ_FT_PER_AANA = 342.25;

/**
 * Groups digits the Nepali way (4,50,00,000). Hand-rolled rather than Intl so the
 * server and browser always produce the same string.
 */
export function groupDigits(value: number): string {
  const digits = Math.round(value).toString();
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${lastThree}`;
}

const trimDecimals = (value: number) => Number(value.toFixed(2)).toString();

/** Short price as written in Nepali listings: "NPR 4.5 Cr", "NPR 35 L". */
export function formatPrice(npr: number): string {
  if (npr >= CRORE) return `NPR ${trimDecimals(npr / CRORE)} Cr`;
  if (npr >= LAKH) return `NPR ${trimDecimals(npr / LAKH)} L`;
  return `NPR ${groupDigits(npr)}`;
}

/**
 * Kathmandu Valley land units: 1 ropani = 16 aana, 1 aana = 4 paisa.
 * 20 aana → "1 ropani 4 aana", 5.5 aana → "5 aana 2 paisa".
 */
export function formatLandArea(aana: number): string {
  const totalPaisa = Math.round(aana * 4);
  const ropani = Math.floor(totalPaisa / 64);
  const wholeAana = Math.floor((totalPaisa % 64) / 4);
  const paisa = totalPaisa % 4;
  const parts: string[] = [];
  if (ropani) parts.push(`${ropani} ropani`);
  if (wholeAana) parts.push(`${wholeAana} aana`);
  if (paisa) parts.push(`${paisa} paisa`);
  return parts.join(" ") || "0 aana";
}

export const aanaToSqFt = (aana: number) => aana * SQ_FT_PER_AANA;

export const formatSqFt = (sqFt: number) => `${groupDigits(sqFt)} sq ft`;
