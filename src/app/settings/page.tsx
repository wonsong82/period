"use client";

import { useEffect, useState, useCallback } from "react";
import type { PeriodData, PeriodConfig } from "@/lib/types";
import { DEFAULT_CONFIG } from "@/lib/types";
import {
  calculateCycleLength,
  predictNextPeriods,
} from "@/lib/calculations";

export default function SettingsPage() {
  const [data, setData] = useState<PeriodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2000);
  };

  const fetchData = useCallback(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const save = async (next: PeriodData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      setData(next);
      flash("success", "Saved");
    } catch {
      flash("error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addDate = () => {
    if (!data || !newDate) return;
    if (data.periodStartDates.includes(newDate)) {
      flash("error", "Date already recorded");
      return;
    }
    save({
      ...data,
      periodStartDates: [...data.periodStartDates, newDate].sort(),
    });
    setNewDate("");
  };

  const removeDate = (date: string) => {
    if (!data) return;
    save({
      ...data,
      periodStartDates: data.periodStartDates.filter((d) => d !== date),
    });
  };

  const updateConfig = (key: keyof PeriodConfig, value: number) => {
    if (!data) return;
    save({ ...data, config: { ...data.config, [key]: value } });
  };

  const resetConfig = () => {
    if (!data) return;
    save({ ...data, config: { ...DEFAULT_CONFIG } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-stone-400">Loading…</div>
      </div>
    );
  }
  if (!data) return null;

  const sorted = [...data.periodStartDates].sort();
  const cycleLength = calculateCycleLength(sorted);
  const predictions =
    sorted.length >= 2 ? predictNextPeriods(sorted, 2) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {toast && (
        <div
          className={`fixed top-16 right-4 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 transition-opacity ${
            toast.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-rose-500 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}


      <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800 mb-1">
          Period Start Dates
        </h2>
        <p className="text-sm text-stone-500 mb-4">
          Enter the first day of each period. At least 2 dates are needed to
          calculate your cycle.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
          <button
            onClick={addDate}
            disabled={!newDate || saving}
            className="px-4 py-2 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>

        {sorted.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
              Recorded
            </h3>
            {sorted.map((date, i) => {
              const daysSincePrev =
                i > 0
                  ? Math.round(
                      (new Date(date + "T12:00:00").getTime() -
                        new Date(sorted[i - 1] + "T12:00:00").getTime()) /
                        86_400_000,
                    )
                  : null;

              return (
                <div
                  key={date}
                  className="flex items-center justify-between px-3 py-2 bg-rose-50 rounded-lg group"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-rose-300 tabular-nums">
                      #{i + 1}
                    </span>
                    <span className="font-medium text-stone-700">
                      {new Date(date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </span>
                    {daysSincePrev !== null && (
                      <span className="text-xs text-stone-400">
                        ({daysSincePrev}d gap)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeDate(date)}
                    className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {sorted.length === 0 && (
          <p className="text-sm text-stone-400 italic mb-4">
            No dates recorded yet.
          </p>
        )}

        {cycleLength !== null && (
          <div className="pt-4 border-t border-stone-100 space-y-3">
            <div className="inline-block bg-stone-100 px-3 py-1.5 rounded-lg text-sm">
              <span className="text-stone-400">Avg cycle:</span>{" "}
              <span className="font-semibold text-stone-700">
                {cycleLength} days
              </span>
            </div>

            <div>
              <h3 className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1.5">
                Predicted Next Periods
              </h3>
              <div className="space-y-1.5">
                {predictions.map((date, i) => (
                  <div
                    key={date}
                    className="flex items-center gap-3 px-3 py-2 bg-violet-50 rounded-lg border border-dashed border-violet-200 text-sm"
                  >
                    <span className="text-violet-400">#{i + 1}</span>
                    <span className="font-medium text-stone-700">
                      {new Date(date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>


      <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-800">
            Configuration
          </h2>
          <button
            onClick={resetConfig}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Reset defaults
          </button>
        </div>

        <div className="space-y-4">
          <ConfigField
            label="Period Length"
            hint="Typical period duration"
            value={data.config.periodLengthDays}
            onChange={(v) => updateConfig("periodLengthDays", v)}
            min={1}
            max={10}
            unit="days"
          />
          <ConfigField
            label="Max Semen Survival"
            hint="How long sperm can survive in the reproductive tract"
            value={data.config.maxSemenSurvivalDays}
            onChange={(v) => updateConfig("maxSemenSurvivalDays", v)}
            min={1}
            max={7}
            unit="days"
          />
          <ConfigField
            label="Max Egg Survival"
            hint="How long the egg survives after ovulation"
            value={data.config.maxEggSurvivalDays}
            onChange={(v) => updateConfig("maxEggSurvivalDays", v)}
            min={1}
            max={3}
            unit="days"
          />
          <ConfigField
            label="Ovulation"
            hint="Days before next period start that ovulation occurs"
            value={data.config.ovulationDaysBefore}
            onChange={(v) => updateConfig("ovulationDaysBefore", v)}
            min={10}
            max={18}
            unit="days before period"
          />
          <ConfigField
            label="Safe Buffer"
            hint="Extra margin added to each side of the fertile window"
            value={data.config.safeBufferDays}
            onChange={(v) => updateConfig("safeBufferDays", v)}
            min={0}
            max={5}
            unit="days"
          />
        </div>
      </section>


      <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">
          How It Works
        </h2>

        <div className="space-y-5 text-sm text-stone-600">
          <FormulaBlock
            title="1. Cycle Length"
            formula="Cycle = avg( Date₂ − Date₁ , Date₃ − Date₂ , … )"
            body="The average gap between consecutive period starts. More data → more accuracy."
            note={
              cycleLength !== null
                ? `Your average: ${cycleLength} days`
                : undefined
            }
          />

          <FormulaBlock
            title="2. Ovulation Day"
            formula={`Ovulation = Next Period Start − ${data.config.ovulationDaysBefore} days`}
            body={`Ovulation typically occurs ${data.config.ovulationDaysBefore} days before the next period (luteal phase). This is when an egg is released from the ovary.`}
          />

          <FormulaBlock
            title="3. Fertile Window"
            formula={[
              `Start = Ovulation − ${data.config.maxSemenSurvivalDays} (semen survival)${data.config.safeBufferDays > 0 ? ` − ${data.config.safeBufferDays} (buffer)` : ""}`,
              `End   = Ovulation + ${data.config.maxEggSurvivalDays} (egg survival)${data.config.safeBufferDays > 0 ? ` + ${data.config.safeBufferDays} (buffer)` : ""}`,
            ].join("\n")}
            body={`Sperm survive up to ${data.config.maxSemenSurvivalDays} days; the egg lives ~${data.config.maxEggSurvivalDays} day after ovulation. The fertile window covers every day where conception is biologically possible.${data.config.safeBufferDays > 0 ? ` A ${data.config.safeBufferDays}-day buffer widens it for safety.` : ""}`}
            note={
              cycleLength !== null
                ? `Window: Day ${cycleLength - data.config.ovulationDaysBefore - data.config.maxSemenSurvivalDays - data.config.safeBufferDays + 1} → Day ${cycleLength - data.config.ovulationDaysBefore + data.config.maxEggSurvivalDays + data.config.safeBufferDays + 1} of each cycle`
                : undefined
            }
          />

          <FormulaBlock
            title="4. Safe Days"
            formula="Safe = everything outside Period + Fertile Window"
            body="Days where pregnancy risk is very low. However, cycles can vary — no calendar method is 100 % reliable."
          />

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="font-medium text-amber-800 mb-1">
              Disclaimer
            </p>
            <p className="text-amber-700 text-xs leading-relaxed">
              This tool uses the calendar / rhythm method which provides
              estimates only. Actual ovulation can shift from cycle to cycle.
              It should <strong>not</strong> be used as the sole method of
              contraception. Consult a healthcare provider for reliable family
              planning advice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ConfigField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-700">{label}</div>
        <div className="text-xs text-stone-400 truncate">{hint}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= min && v <= max) onChange(v);
          }}
          min={min}
          max={max}
          className="w-16 px-2 py-1.5 border border-stone-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <span className="text-xs text-stone-400 whitespace-nowrap">
          {unit}
        </span>
      </div>
    </div>
  );
}

function FormulaBlock({
  title,
  formula,
  body,
  note,
}: {
  title: string;
  formula: string;
  body: string;
  note?: string;
}) {
  return (
    <div>
      <h3 className="font-medium text-stone-700 mb-1">{title}</h3>
      <pre className="bg-stone-50 rounded-lg px-3 py-2 font-mono text-xs text-stone-600 whitespace-pre-wrap mb-1">
        {formula}
      </pre>
      <p className="text-stone-500">{body}</p>
      {note && (
        <p className="text-stone-400 text-xs mt-1 italic">→ {note}</p>
      )}
    </div>
  );
}
