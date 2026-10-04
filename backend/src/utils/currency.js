/**
 * Currency utilities for Integer Paise calculations
 * Prevents floating point errors. All amounts in DB are BigInt/Integer paise.
 */

export const rupeesToPaise = (rupees) => {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return 0;
  return Math.round(Number(rupees) * 100);
};

export const paiseToRupees = (paise) => {
  if (paise === null || paise === undefined) return 0;
  return Number(paise) / 100;
};

export const formatINR = (paise) => {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
};
