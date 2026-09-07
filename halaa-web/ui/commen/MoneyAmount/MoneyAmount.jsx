import { formatCurrency, formatNumber } from "@halaa/shared/utils/locale";
import SarIcon from "@/ui/commen/SarIcon/SarIcon";

/**
 * Canonical human-facing web money renderer.
 *
 * SAR values use the official Saudi Riyal mark. Machine-readable values,
 * payment payloads, exports and structured data must continue to use ISO SAR.
 */
export default function MoneyAmount({
  amount,
  currency = "SAR",
  locale = "ar",
  className = "",
  symbolSize = "0.9em",
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
  fallback = "—",
}) {
  if (amount === null || amount === undefined || amount === "") return fallback;

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return fallback;

  const normalizedCurrency = String(currency || "SAR").toUpperCase();
  if (normalizedCurrency !== "SAR") {
    return (
      <span className={className}>
        {formatCurrency(numericAmount, locale, normalizedCurrency, {
          minimumFractionDigits,
          maximumFractionDigits,
        })}
      </span>
    );
  }

  const formattedAmount = formatNumber(numericAmount, locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
  const accessibleCurrency = String(locale || "ar").startsWith("ar")
    ? "ريال سعودي"
    : "Saudi Riyal";

  return (
    <span
      className={className}
      aria-label={`${formattedAmount} ${accessibleCurrency}`}
      style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25em" }}
    >
      <span aria-hidden="true">{formattedAmount}</span>
      <SarIcon size={symbolSize} decorative />
    </span>
  );
}
