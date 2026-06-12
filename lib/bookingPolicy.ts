// Booking-integrity policy: cancellation window + active-booking soft cap.
// Pure functions (no DB, no env) so routes, UI, and the self-test share
// one source of truth. Adjust the two constants below to retune policy.

/** Cancellation is allowed only this many hours (or more) before the slot. */
export const CANCEL_MIN_HOURS_BEFORE = 12;

/**
 * Soft cap on simultaneously active (pending/confirmed) bookings per
 * verified email. Generous on purpose — OTP + send rate limits are the
 * real anti-abuse guard; this only stops runaway duplication.
 */
export const MAX_ACTIVE_BOOKINGS_PER_EMAIL = 5;

/** Statuses a customer can still cancel from. */
export const CANCELLABLE_STATUSES = ['pending', 'confirmed'] as const;

/** Epoch ms of a booking slot. Slots are stored as IST wall-clock times. */
export function slotInstant(bookingDate: string, bookingTime: string): number {
  const time = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
  return new Date(`${bookingDate}T${time}+05:30`).getTime();
}

export function isCancellable(
  status: string,
  bookingDate: string,
  bookingTime: string,
  now: number = Date.now(),
): boolean {
  if (!(CANCELLABLE_STATUSES as readonly string[]).includes(status)) return false;
  const msUntilSlot = slotInstant(bookingDate, bookingTime) - now;
  return msUntilSlot >= CANCEL_MIN_HOURS_BEFORE * 60 * 60 * 1000;
}

/** True while another booking may be created for this email. */
export function underActiveBookingCap(activeCount: number): boolean {
  return activeCount < MAX_ACTIVE_BOOKINGS_PER_EMAIL;
}
