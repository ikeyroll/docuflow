import type { DocType, Prisma } from "@prisma/client";

// The transaction client type exposed by Prisma.$transaction callback
type PrismaTx = Prisma.TransactionClient;

/**
 * Atomically generates the next document number for the given docType.
 * Must be called inside a Prisma transaction.
 */
export async function generateNextNumber(tx: PrismaTx, docType: DocType): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Fetch and lock the numbering config row
  const config = await tx.numberingConfig.findUniqueOrThrow({ where: { docType } });

  let sequence = config.currentSequence + 1;

  // Yearly reset
  if (config.resetYearly && config.lastResetYear !== null && config.lastResetYear < currentYear) {
    sequence = 1;
  }

  // Update sequence and last reset year
  await tx.numberingConfig.update({
    where: { docType },
    data: {
      currentSequence: sequence,
      lastResetYear: currentYear,
    },
  });

  return formatDocNumber(config.format, config.prefix, sequence, currentYear);
}

/**
 * Replace pattern tokens in the format string.
 * Tokens: {PREFIX}, {YYYY}, {YY}, {MM}, {SEQ:N}
 */
export function formatDocNumber(
  format: string,
  prefix: string,
  sequence: number,
  year?: number,
  month?: number
): string {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  return format
    .replace("{PREFIX}", prefix)
    .replace("{YYYY}", String(y))
    .replace("{YY}", String(y).slice(-2))
    .replace("{MM}", String(m).padStart(2, "0"))
    .replace(/{SEQ:(\d+)}/g, (_, digits) => String(sequence).padStart(parseInt(digits), "0"));
}
