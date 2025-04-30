/**
 * Formats a price with a maximum of 4 leading zeros normally, using subscript notation for more zeros
 * @param value The price value to format
 * @returns Formatted price string (e.g., "$1234", "$0.0002525", "$0.0₄2525")
 */
export function formatPrice(value: number): string {
  if (value === 0) {
    return '$0';
  }

  // For numbers >= 1, show up to 4 significant digits
  if (value >= 1) {
    return `$${Number(value.toFixed(4)).toLocaleString()}`;
  }

  // Count leading zeros after decimal point
  const leadingZeros = Math.max(0, -Math.floor(Math.log10(value)) - 1);

  // If 4 or fewer leading zeros, show the number normally
  if (leadingZeros <= 4) {
    // Show all digits up to 4 decimal places after the significant digits
    const significantDigits = 4;
    const totalDecimals = leadingZeros + significantDigits;
    return `$${value.toFixed(totalDecimals)}`;
  }

  // For more than 4 leading zeros, use subscript notation
  // Extract the significant digits (always show 4 digits)
  const normalized = value * 10 ** leadingZeros;
  const significantDigits = normalized.toFixed(4);

  // Convert number to subscript using unicode subscript digits
  const subscriptMap: { [key: string]: string } = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
  };
  const subscript = (leadingZeros - 1)
    .toString()
    .split('')
    .map((digit) => subscriptMap[digit])
    .join('');

  return `$0.0${subscript}${significantDigits.slice(2)}`;
}

/**
 * Formats a large number using T, B, M, k suffixes
 * @param value The number to format
 * @returns Formatted string (e.g., "1.23T", "45.6B", "789.1M", "123.4k")
 */
export function formatSupply(value: number): string {
  if (value === 0) {
    return '0';
  }

  const units = [
    { value: 1e12, symbol: 'T' },
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'k' },
  ];

  for (const { value: unitValue, symbol } of units) {
    if (value >= unitValue) {
      const scaled = value / unitValue;
      // Use fewer decimal places for larger numbers
      const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      // Format with the appropriate number of decimal places
      const formatted = scaled.toFixed(digits);
      // Remove trailing zeros after decimal point
      const cleanFormatted = formatted.replace(/\.?0+$/, '');
      return `${cleanFormatted}${symbol}`;
    }
  }

  // For numbers less than 1000, just round to whole numbers
  return Math.round(value).toString();
}

/**
 * Formats currency values for display
 * @param value The value to format
 * @returns Formatted currency string using formatSupply (e.g., "$1.23T", "$45.6B")
 */
export function formatCurrency(value: number): string {
  if (value === 0) {
    return '$0';
  }
  return `$${formatSupply(value)}`;
}

/**
 * General purpose number formatter that handles decimals and rounding
 * @param value The number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted number string with the specified number of decimal places
 */
export function formatNumber(value: number, decimals = 2): string {
  if (value === 0) {
    return '0';
  }

  // For very small numbers, use the price formatter to get better precision
  if (Math.abs(value) < 0.001) {
    return formatPrice(value).slice(1); // Remove the $ prefix
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
