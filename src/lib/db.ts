import fs from "fs";
import path from "path";
import { PeriodData, DEFAULT_CONFIG } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "period-data.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getData(): PeriodData {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initial: PeriodData = {
      periodStartDates: [],
      config: { ...DEFAULT_CONFIG },
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PeriodData;
}

export function saveData(data: PeriodData): void {
  ensureDataDir();
  data.periodStartDates = [...data.periodStartDates].sort();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
