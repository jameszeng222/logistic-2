import { create } from "zustand";
import type { QueryHistory, QueryResult } from "@/types";
import { generateId } from "@/utils/formatter";

interface HistoryState {
  histories: QueryHistory[];
  addHistory: (
    countryCode: string,
    countryName: string,
    weight: number,
    dimensions: { l: number; w: number; h: number },
    results: QueryResult[]
  ) => void;
  deleteHistory: (id: string) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = "logistics_history";

function loadHistory(): QueryHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveHistory(histories: QueryHistory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(histories));
  } catch {
    // ignore
  }
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  histories: loadHistory(),

  addHistory: (countryCode, countryName, weight, dimensions, results) => {
    const newHistory: QueryHistory = {
      id: generateId(),
      countryCode,
      countryName,
      weight,
      dimensions,
      queryTime: new Date().toISOString(),
      results,
    };
    const updated = [newHistory, ...get().histories].slice(0, 50);
    set({ histories: updated });
    saveHistory(updated);
  },

  deleteHistory: (id) => {
    const updated = get().histories.filter((h) => h.id !== id);
    set({ histories: updated });
    saveHistory(updated);
  },

  clearHistory: () => {
    set({ histories: [] });
    saveHistory([]);
  },
}));
