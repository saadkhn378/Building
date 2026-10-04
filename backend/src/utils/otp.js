import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric code
 * @returns {string} 6-digit code string
 */
export const generate6DigitCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Returns Date object offset by hours
 * @param {number} hours
 */
export const getExpiryHours = (hours = 24) => {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
};

/**
 * Returns Date object offset by days
 * @param {number} days
 */
export const getExpiryDays = (days = 7) => {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  return d;
};
