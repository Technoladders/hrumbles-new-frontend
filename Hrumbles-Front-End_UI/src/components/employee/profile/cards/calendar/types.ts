
export interface Holiday {
  date: string;
  name: string;
  localName: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  type: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isHoliday: boolean;
  isSunday: boolean;
  holidayInfo?: Holiday;
}
