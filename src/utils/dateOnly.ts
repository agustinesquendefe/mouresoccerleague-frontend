const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;

  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function parseStoredDate(value?: string | null): Date | null {
  if (!value) return null;

  const dateOnly = parseDateOnly(value);
  if (dateOnly) return dateOnly;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatStoredDate(
  value?: string | null,
  locale?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '-';

  const date = parseStoredDate(value);
  if (!date) return value;

  return date.toLocaleDateString(locale, options);
}

export function getAgeFromDateOnly(value?: string | null, today = new Date()): number {
  const birth = parseDateOnly(value);
  if (!birth) return 0;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
