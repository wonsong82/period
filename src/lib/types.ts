export interface PeriodConfig {
  maxSemenSurvivalDays: number;
  maxEggSurvivalDays: number;
  ovulationDaysBefore: number;
  safeBufferDays: number;
  periodLengthDays: number;
}

export interface PeriodData {
  periodStartDates: string[]; // YYYY-MM-DD, sorted ascending
  config: PeriodConfig;
}

export const DEFAULT_CONFIG: PeriodConfig = {
  maxSemenSurvivalDays: 5,
  maxEggSurvivalDays: 1,
  ovulationDaysBefore: 14,
  safeBufferDays: 0,
  periodLengthDays: 5,
};

export type DayType = "period" | "ovulation" | "fertile" | "safe";

export interface DayInfo {
  date: string;
  type: DayType;
  cycleDay: number;
  isToday: boolean;
  isPredicted: boolean;
  riskPercent: number;
}
