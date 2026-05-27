export type WeekdayOption = {
  value: number;
  label: string;
};

export const WEEKDAY_OPTIONS: WeekdayOption[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export function getWeekdayLabel(value: number | null | undefined): string {
  return WEEKDAY_OPTIONS.find((day) => day.value === value)?.label ?? '-';
}
