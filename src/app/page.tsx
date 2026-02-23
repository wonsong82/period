"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { PeriodData, DayInfo, DayType } from "@/lib/types";
import {
  generateCalendarData,
  getCalendarRange,
  getMonthsBetween,
  formatDate,
  calculateCycleLength,
  predictNextPeriods,
} from "@/lib/calculations";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const TYPE_ICONS: Record<DayType, string> = {
  period: "🩸",
  ovulation: "🥚",
  fertile: "💧",
  safe: "",
};

const TYPE_LABELS: Record<DayType, string> = {
  period: "Period",
  ovulation: "Ovulation",
  fertile: "Fertile Window",
  safe: "Safe Day",
};

/** Convert a 0–100 risk percent into an HSL background + text color */
function riskToColor(risk: number): { bg: string; text: string } {
  const hue = 120 * (1 - risk / 100); // 120 (green) → 0 (red)
  const sat = 65 + risk * 0.15; // 65% → 80%
  const light = 95 - risk * 0.15; // 95% → 80%
  return {
    bg: `hsl(${hue}, ${sat}%, ${light}%)`,
    text: `hsl(${hue}, 50%, 25%)`,
  };
}


function riskLabel(risk: number): string {
  if (risk === 0) return "Safe (0%)";
  if (risk <= 15) return `Very Low (${risk}%)`;
  if (risk <= 40) return `Low (${risk}%)`;
  if (risk <= 60) return `Moderate (${risk}%)`;
  if (risk <= 85) return `High (${risk}%)`;
  return `Very High (${risk}%)`;
}


function riskLabelColor(risk: number): string {
  if (risk <= 15) return "text-emerald-600";
  if (risk <= 40) return "text-lime-600";
  if (risk <= 60) return "text-amber-600";
  if (risk <= 85) return "text-orange-600";
  return "text-rose-600";
}

export default function CalendarPage() {
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const sortedDates = useMemo(
    () => (data?.periodStartDates ? [...data.periodStartDates].sort() : []),
    [data],
  );

  const calendarData = useMemo(() => {
    if (sortedDates.length < 2 || !data) return null;
    return generateCalendarData(sortedDates, data.config);
  }, [sortedDates, data]);

  const months = useMemo(() => {
    if (sortedDates.length < 2 || !data) return [];
    const range = getCalendarRange(sortedDates, data.config);
    if (!range) return [];
    return getMonthsBetween(range.startMonth, range.endMonth);
  }, [sortedDates, data]);

  const cycleLength = useMemo(
    () => calculateCycleLength(sortedDates),
    [sortedDates],
  );

  const predictions = useMemo(
    () => (sortedDates.length >= 2 ? predictNextPeriods(sortedDates, 2) : []),
    [sortedDates],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Loading…</div>
      </div>
    );
  }

  if (!data || sortedDates.length < 2) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <div className="text-6xl">📅</div>
        <h2 className="text-xl font-semibold text-stone-800">
          Not Enough Data
        </h2>
        <p className="text-stone-500">
          {sortedDates.length === 0
            ? "Add at least 2 period start dates to see your calendar."
            : "Add 1 more period start date to calculate your cycle."}
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 transition-colors"
        >
          Go to Settings →
        </Link>
      </div>
    );
  }

  const todayStr = formatDate(new Date());
  const todayInfo = calendarData?.get(todayStr) ?? null;

  return (
    <div className="space-y-6">
      <TodayStatus info={todayInfo} />

      <div className="flex flex-wrap gap-3 text-sm">
        <Stat label="Cycle Length" value={`${cycleLength} days`} />
        <Stat
          label="Next Period"
          value={new Date(predictions[0] + "T12:00:00").toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" },
          )}
        />
        <Stat
          label="Recorded Periods"
          value={String(sortedDates.length)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {months.map((month) => (
          <MonthGrid
            key={`${month.getFullYear()}-${month.getMonth()}`}
            year={month.getFullYear()}
            month={month.getMonth()}
            calendarData={calendarData!}
            todayStr={todayStr}
          />
        ))}
      </div>

      <Legend />
    </div>
  );
}

function TodayStatus({ info }: { info: DayInfo | null }) {
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">
            Today — {dateLabel}
          </h2>
          {info ? (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {TYPE_ICONS[info.type] && (
                <span className="text-2xl">{TYPE_ICONS[info.type]}</span>
              )}
              <span className="text-lg font-semibold text-stone-800">
                {TYPE_LABELS[info.type]}
              </span>
              <span className="text-stone-300">·</span>
              <span className="text-sm text-stone-500">
                Day {info.cycleDay} of cycle
              </span>
              {info.isPredicted && (
                <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                  Predicted
                </span>
              )}
            </div>
          ) : (
            <p className="mt-1 text-stone-500">
              Today is outside the tracked range
            </p>
          )}
        </div>
        {info && (
          <div className="text-right">
            <div className="text-xs text-stone-400 uppercase tracking-wide">
              Pregnancy Risk
            </div>
            <div className={`text-lg font-bold ${riskLabelColor(info.riskPercent)}`}>
              {riskLabel(info.riskPercent)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 px-4 py-3 shadow-sm">
      <span className="text-stone-400">{label}:</span>{" "}
      <span className="font-semibold text-stone-800">{value}</span>
    </div>
  );
}

function MonthGrid({
  year,
  month,
  calendarData,
  todayStr,
}: {
  year: number;
  month: number;
  calendarData: Map<string, DayInfo>;
  todayStr: string;
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <h3 className="text-center font-semibold text-stone-700 mb-3">
        {MONTH_NAMES[month]} {year}
      </h3>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[11px] font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const info = calendarData.get(dateStr);

          const icon = info ? TYPE_ICONS[info.type] : "";
          const colors = info
            ? riskToColor(info.riskPercent)
            : { bg: "transparent", text: "#a8a29e" };

          const todayRing = info?.isToday
            ? "ring-2 ring-blue-500 ring-offset-1"
            : "";
          const isFuture = dateStr > todayStr;

          return (
            <div
              key={dateStr}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-md text-xs ${todayRing}`}
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                opacity: isFuture ? 0.6 : 1,
              }}
              title={
                info
                  ? `${TYPE_LABELS[info.type]} · Day ${info.cycleDay} · Risk: ${info.riskPercent}%${info.isPredicted ? " (Predicted)" : ""}`
                  : undefined
              }
            >
              {icon && (
                <span className="text-[10px] leading-none">{icon}</span>
              )}
              <span className={icon ? "text-[10px]" : ""}>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
      <h3 className="font-medium text-stone-700 mb-3">Legend</h3>
      <div className="space-y-3">

        <div>
          <div className="text-xs text-stone-500 mb-1">
            Pregnancy Risk (background color)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-600 font-medium">0%</span>
            <div
              className="flex-1 h-5 rounded"
              style={{
                background:
                  "linear-gradient(to right, hsl(120, 65%, 95%), hsl(60, 73%, 88%), hsl(0, 80%, 80%))",
              }}
            />
            <span className="text-xs text-rose-600 font-medium">100%</span>
          </div>
        </div>


        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <LegendItem icon="🩸" label="Period Day" />
          <LegendItem icon="🥚" label="Ovulation Day" />
          <LegendItem icon="💧" label="Fertile Window" />
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded ring-2 ring-blue-500 ring-offset-1" />
            <span className="text-stone-600">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-stone-200" style={{ opacity: 0.6 }} />
            <span className="text-stone-600">Future</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded bg-stone-50 flex items-center justify-center text-[12px]">
        {icon}
      </div>
      <span className="text-stone-600">{label}</span>
    </div>
  );
}
