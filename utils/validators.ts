/**
 * Validate phone number (Indian format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate OTP (4 or 6 digits)
 */
export function isValidOTP(otp: string, length: number = 4): boolean {
  const otpRegex = new RegExp(`^\\d{${length}}$`);
  return otpRegex.test(otp);
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(value: string | null | null): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Validate minimum selections
 */
export function hasMinimumSelections(selections: string[], minimum: number): boolean {
  return selections.length >= minimum;
}