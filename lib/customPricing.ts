// Custom-move indicative pricing. Pure compute + default rate card live
// here (client-safe — the booking wizard shows a live price); the server
// passes a Supabase client to loadRateCard() to prefer estimator_settings
// when that table exists (04_estimator migration, not yet applied
// everywhere). All money in paise.

export const CUSTOM_WORKERS_MIN = 2;
export const CUSTOM_WORKERS_MAX = 8;
export const CUSTOM_HOURS_MIN = 2;
export const CUSTOM_HOURS_MAX = 12;
/** A job at or under this many hours is billed at the half-day labor rate. */
export const HALF_DAY_MAX_HOURS = 4;

export type VehicleOption = { id: string; label: string; ratePaise: number };

export type CustomRateCard = {
  /** Per-worker labor for a job of <= HALF_DAY_MAX_HOURS hours. */
  laborHalfDayPaise: number;
  /** Per-worker labor for a longer job. */
  laborFullDayPaise: number;
  vehicles: VehicleOption[];
};

// Indicative Bengaluru rates — placeholders until the owner tunes them
// (or the estimator_settings table overrides them).
export const DEFAULT_RATE_CARD: CustomRateCard = {
  laborHalfDayPaise: 80_000, // ₹800 / worker
  laborFullDayPaise: 140_000, // ₹1,400 / worker
  vehicles: [
    { id: 'tata-ace', label: 'Tata Ace (mini truck)', ratePaise: 180_000 }, // ₹1,800
    { id: '14ft', label: '14 ft truck', ratePaise: 350_000 }, // ₹3,500
    { id: '17ft', label: '17 ft truck', ratePaise: 450_000 }, // ₹4,500
    { id: '19ft', label: '19 ft truck', ratePaise: 550_000 }, // ₹5,500
  ],
};

export type CustomSelection = {
  workers: number;
  vehicle: string; // VehicleOption id
  hours: number;
};

/**
 * Indicative price: labor (workers × half/full-day rate by hours) +
 * vehicle rate. Returns paise; null when the vehicle id is unknown.
 */
export function computeCustomPrice(
  selection: CustomSelection,
  rateCard: CustomRateCard = DEFAULT_RATE_CARD,
): number | null {
  const vehicle = rateCard.vehicles.find((v) => v.id === selection.vehicle);
  if (!vehicle) return null;
  const laborRate =
    selection.hours <= HALF_DAY_MAX_HOURS
      ? rateCard.laborHalfDayPaise
      : rateCard.laborFullDayPaise;
  return selection.workers * laborRate + vehicle.ratePaise;
}

// Minimal shape so we don't couple to a generated client type — any
// Supabase client (admin or anon) satisfies this.
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
};

type EstimatorSettingsRow = {
  labor_half_day_paise?: number;
  labor_full_day_paise?: number;
  vehicles?: VehicleOption[];
};

/**
 * Server-side rate card: reads estimator_settings when the table exists,
 * falling back (silently) to DEFAULT_RATE_CARD when it doesn't or the
 * row is incomplete.
 */
export async function loadRateCard(supabase: SupabaseLike): Promise<CustomRateCard> {
  try {
    const { data, error } = await supabase
      .from('estimator_settings')
      .select('*')
      .maybeSingle();
    if (error || !data) return DEFAULT_RATE_CARD;
    const row = data as EstimatorSettingsRow;
    return {
      laborHalfDayPaise:
        typeof row.labor_half_day_paise === 'number'
          ? row.labor_half_day_paise
          : DEFAULT_RATE_CARD.laborHalfDayPaise,
      laborFullDayPaise:
        typeof row.labor_full_day_paise === 'number'
          ? row.labor_full_day_paise
          : DEFAULT_RATE_CARD.laborFullDayPaise,
      vehicles:
        Array.isArray(row.vehicles) && row.vehicles.length > 0
          ? row.vehicles
          : DEFAULT_RATE_CARD.vehicles,
    };
  } catch {
    // Table missing (estimator migration not applied) — use defaults.
    return DEFAULT_RATE_CARD;
  }
}
