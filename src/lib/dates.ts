export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isoMonth(d: Date): string {
  return isoDate(d).slice(0, 7);
}

/** Months strictly between two "YYYY-MM" strings, exclusive of `from`, inclusive of `to`. */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m < tm)) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    out.push(`${y}-${m.toString().padStart(2, "0")}`);
  }
  return out;
}

/** All allowance due dates matching cadence/day in (afterDate, uptoDate]. Dates are "YYYY-MM-DD". */
export function dueDates(
  cadence: "weekly" | "monthly",
  day: number,
  afterDate: string | null,
  uptoDate: string
): string[] {
  const out: string[] = [];
  const end = new Date(uptoDate + "T12:00:00");
  // scan back at most 366 days; allowances older than that pay from first scanned date
  const start = new Date(end);
  start.setDate(start.getDate() - 366);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = isoDate(d);
    if (afterDate && iso <= afterDate) continue;
    const matches =
      cadence === "weekly" ? d.getDay() === day : d.getDate() === day;
    if (matches) out.push(iso);
  }
  return out;
}
