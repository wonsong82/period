import { PeriodConfig, DayInfo, DayType } from "./types";


export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}


/**
 * Pregnancy risk 0–100 based on how many days from ovulation.
 * Before ovulation: risk decays with distance (semen dies).
 * After ovulation: risk decays with distance (egg dies).
 */
function calculateRiskPercent(
  dayInCycle: number,
  ovulationDay: number,
  config: PeriodConfig,
): number {
  const dist = dayInCycle - ovulationDay;

  const beforeReach = config.maxSemenSurvivalDays + config.safeBufferDays;
  const beforeRisk =
    dist <= 0
      ? Math.max(0, (beforeReach - Math.abs(dist) + 1) / (beforeReach + 1))
      : 0;

  const afterReach = config.maxEggSurvivalDays + config.safeBufferDays;
  const afterRisk =
    dist >= 0
      ? Math.max(0, (afterReach - dist + 1) / (afterReach + 1))
      : 0;

  return Math.round(Math.max(beforeRisk, afterRisk) * 100);
}

/** Average cycle length from sorted period start dates. */
export function calculateCycleLength(sortedDates: string[]): number | null {
  if (sortedDates.length < 2) return null;
  let total = 0;
  for (let i = 1; i < sortedDates.length; i++) {
    total += daysBetween(parseDate(sortedDates[i - 1]), parseDate(sortedDates[i]));
  }
  return Math.round(total / (sortedDates.length - 1));
}

/** Predict next `count` period start dates. */
export function predictNextPeriods(
  sortedDates: string[],
  count: number,
): string[] {
  const cycleLength = calculateCycleLength(sortedDates);
  if (!cycleLength) return [];
  const last = parseDate(sortedDates[sortedDates.length - 1]);
  const predictions: string[] = [];
  for (let i = 1; i <= count; i++) {
    predictions.push(formatDate(addDays(last, cycleLength * i)));
  }
  return predictions;
}

/**
 * Build a Map<dateString, DayInfo> covering every day from the first recorded
 * period through the end of the second predicted period.
 */
export function generateCalendarData(
  periodStartDates: string[],
  config: PeriodConfig,
): Map<string, DayInfo> {
  const sorted = [...periodStartDates].sort();
  if (sorted.length < 2) return new Map();

  const predictions = predictNextPeriods(sorted, 2);
  const allStarts = [...sorted, ...predictions];
  const todayStr = formatDate(new Date());
  const map = new Map<string, DayInfo>();

  for (let i = 0; i < allStarts.length - 1; i++) {
    const cycleStart = parseDate(allStarts[i]);
    const nextStart = parseDate(allStarts[i + 1]);
    const cycleLen = daysBetween(cycleStart, nextStart);

    // Cycle is "predicted" when the next-period boundary is a prediction
    const isPredicted = i >= sorted.length - 1;

    // Ovulation day within this cycle, clamped so it never lands during period
    const ovulationDay = Math.max(
      config.periodLengthDays,
      cycleLen - config.ovulationDaysBefore,
    );
    const fertileStart =
      ovulationDay - config.maxSemenSurvivalDays - config.safeBufferDays;
    const fertileEnd =
      ovulationDay + config.maxEggSurvivalDays + config.safeBufferDays;

    for (let day = 0; day < cycleLen; day++) {
      const dateStr = formatDate(addDays(cycleStart, day));

      let type: DayType = "safe";
      if (day < config.periodLengthDays) {
        type = "period";
      } else if (day === ovulationDay) {
        type = "ovulation";
      } else if (day >= fertileStart && day <= fertileEnd) {
        type = "fertile";
      }

      map.set(dateStr, {
        date: dateStr,
        type,
        cycleDay: day + 1,
        isToday: dateStr === todayStr,
        isPredicted,
        riskPercent: calculateRiskPercent(day, ovulationDay, config),
      });
    }
  }

  // Period days for the last predicted start
  const lastStart = parseDate(allStarts[allStarts.length - 1]);
  for (let day = 0; day < config.periodLengthDays; day++) {
    const dateStr = formatDate(addDays(lastStart, day));
    map.set(dateStr, {
      date: dateStr,
      type: "period",
      cycleDay: day + 1,
      isToday: dateStr === todayStr,
      isPredicted: true,
      riskPercent: 0,
    });
  }

  return map;
}

/** Month range the calendar should display. */
export function getCalendarRange(
  periodStartDates: string[],
  config: PeriodConfig,
): { startMonth: Date; endMonth: Date } | null {
  const sorted = [...periodStartDates].sort();
  if (sorted.length < 2) return null;

  const predictions = predictNextPeriods(sorted, 2);
  const first = parseDate(sorted[0]);
  const lastPredEnd = addDays(
    parseDate(predictions[predictions.length - 1]),
    config.periodLengthDays,
  );

  return {
    startMonth: new Date(first.getFullYear(), first.getMonth(), 1),
    endMonth: new Date(lastPredEnd.getFullYear(), lastPredEnd.getMonth(), 1),
  };
}

/** All first-of-month dates between start and end inclusive. */
export function getMonthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= endMonth) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}
