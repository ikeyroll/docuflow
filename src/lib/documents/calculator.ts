/**
 * Document calculation engine.
 * All values are integers in sen (1 RM = 100 sen).
 * No floating point arithmetic.
 */

export interface LineItemCalcInput {
  quantity: number;        // integer × 100 (e.g. 1.5 units = 150)
  unitPriceSen: number;    // integer in sen
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;   // PERCENTAGE: basis points (e.g. 1000 = 10%). FIXED: sen
  taxRate: number;         // basis points (e.g. 600 = 6%)
}

export interface LineItemCalcResult {
  grossSen: number;
  discountSen: number;
  netSen: number;
  taxSen: number;
  totalSen: number;
}

export interface DocumentTotals {
  subtotalSen: number;
  discountTotalSen: number;
  taxTotalSen: number;
  roundingAdjSen: number;
  grandTotalSen: number;
}

/**
 * Calculate a single line item.
 * quantity is stored as integer × 100 to support 2 decimal places.
 */
export function calculateLineItem(item: LineItemCalcInput): LineItemCalcResult {
  const grossSen = Math.round((item.quantity * item.unitPriceSen) / 100);

  let discountSen: number;
  if (item.discountType === "PERCENTAGE") {
    discountSen = Math.round((grossSen * item.discountValue) / 10000);
  } else {
    discountSen = item.discountValue;
  }

  const netSen = grossSen - discountSen;
  const taxSen = Math.round((netSen * item.taxRate) / 10000);
  const totalSen = netSen + taxSen;

  return { grossSen, discountSen, netSen, taxSen, totalSen };
}

/**
 * Calculate document-level totals from all line items.
 */
export function calculateDocumentTotals(items: LineItemCalcInput[]): DocumentTotals {
  let subtotalSen = 0;
  let discountTotalSen = 0;
  let taxTotalSen = 0;

  for (const item of items) {
    const calc = calculateLineItem(item);
    subtotalSen += calc.grossSen;
    discountTotalSen += calc.discountSen;
    taxTotalSen += calc.taxSen;
  }

  const preRoundTotal = subtotalSen - discountTotalSen + taxTotalSen;
  const roundingAdjSen = roundTo5Sen(preRoundTotal) - preRoundTotal;
  const grandTotalSen = preRoundTotal + roundingAdjSen;

  return { subtotalSen, discountTotalSen, taxTotalSen, roundingAdjSen, grandTotalSen };
}

/**
 * Bank Negara rounding rule: round to nearest 5 sen.
 */
export function roundTo5Sen(sen: number): number {
  return Math.round(sen / 5) * 5;
}

/**
 * Calculate the rounding adjustment for a total.
 */
export function calculateRoundingAdj(totalSen: number): number {
  return roundTo5Sen(totalSen) - totalSen;
}

/**
 * Format sen as RM string for display.
 */
export function formatMoney(sen: number, currency = "MYR"): string {
  const ringgit = sen / 100;
  const prefix = currency === "MYR" ? "RM" : currency;
  return `${prefix} ${ringgit.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Convert RM decimal string/number to sen integer.
 */
export function ringgitToSen(ringgit: string | number): number {
  const num = typeof ringgit === "string" ? parseFloat(ringgit) : ringgit;
  return Math.round(num * 100);
}
