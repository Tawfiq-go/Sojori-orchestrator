export interface CalendarDay {
  date: string;
  price?: number;
  available?: boolean;
  minNights?: number;
  maxNights?: number;
  [key: string]: unknown;
}

export interface CalendarMonthRequest {
  listingId: string;
  startDate: string;
  endDate: string;
}

export interface CalendarMonthResponse {
  success: boolean;
  message?: string;
  data: CalendarDay[];
}

export interface CalendarUpdateRequest {
  type?: string;
  roomTypeId?: string;
  date_from?: string;
  date_to?: string;
  [key: string]: unknown;
}

export interface CalendarUpdateResponse {
  success: boolean;
  message?: string;
  postUpdateDocs: CalendarDay[];
}
