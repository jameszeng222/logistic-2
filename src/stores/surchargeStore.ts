import { create } from "zustand";
import type { FuelSurcharge, AdditionalSurcharge } from "@/types/surcharge";

interface SurchargeState {
  fuelSurcharges: FuelSurcharge[];
  additionalSurcharges: AdditionalSurcharge[];

  setFuelSurcharge: (carrierId: string, rate: number, note?: string) => void;
  removeFuelSurcharge: (carrierId: string) => void;
  getFuelSurcharge: (carrierId: string) => number;

  addAdditionalSurcharge: (surcharge: Omit<AdditionalSurcharge, "id">) => void;
  updateAdditionalSurcharge: (id: string, updates: Partial<Omit<AdditionalSurcharge, "id">>) => void;
  removeAdditionalSurcharge: (id: string) => void;
  getAdditionalSurchargeTotal: (carrierId: string, countryCode: string) => number;
  getAdditionalSurchargesByCarrier: (carrierId: string) => AdditionalSurcharge[];
}

const FUEL_KEY = "logistics_fuel_surcharges_v1";
const ADDITIONAL_KEY = "logistics_additional_surcharges_v2";

function loadFuel(): FuelSurcharge[] {
  try {
    const stored = localStorage.getItem(FUEL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => ({
        ...item,
        rate: typeof item.rate === 'number' ? item.rate : parseFloat(item.rate) || 0,
      }));
    }
  } catch {}
  return [];
}

function saveFuel(items: FuelSurcharge[]) {
  try {
    localStorage.setItem(FUEL_KEY, JSON.stringify(items));
  } catch {}
}

function loadAdditional(): AdditionalSurcharge[] {
  try {
    const stored = localStorage.getItem(ADDITIONAL_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((item: any) => ({
        ...item,
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
      }));
    }
  } catch {}
  return [];
}

function saveAdditional(items: AdditionalSurcharge[]) {
  try {
    localStorage.setItem(ADDITIONAL_KEY, JSON.stringify(items));
  } catch {}
}

function isSurchargeActive(surcharge: AdditionalSurcharge): boolean {
  if (surcharge.isPermanent) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (surcharge.startDate) {
    const start = new Date(surcharge.startDate);
    start.setHours(0, 0, 0, 0);
    if (today < start) return false;
  }
  if (surcharge.endDate) {
    const end = new Date(surcharge.endDate);
    end.setHours(23, 59, 59, 999);
    if (today > end) return false;
  }
  return true;
}

export const useSurchargeStore = create<SurchargeState>((set, get) => ({
  fuelSurcharges: loadFuel(),
  additionalSurcharges: loadAdditional(),

  setFuelSurcharge: (carrierId, rate, note) => {
    const items = [...get().fuelSurcharges];
    const idx = items.findIndex((f) => f.carrierId === carrierId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], rate, note };
    } else {
      items.push({ carrierId, rate, note });
    }
    set({ fuelSurcharges: items });
    saveFuel(items);
  },

  removeFuelSurcharge: (carrierId) => {
    const items = get().fuelSurcharges.filter((f) => f.carrierId !== carrierId);
    set({ fuelSurcharges: items });
    saveFuel(items);
  },

  getFuelSurcharge: (carrierId) => {
    const lowerId = carrierId.toLowerCase();
    const found = get().fuelSurcharges.find((f) => f.carrierId.toLowerCase() === lowerId);
    if (found) return found.rate;
    const defaults: Record<string, number> = {
      dhl: 0.18,
      ups: 0.17,
      fedex: 0.16,
    };
    return defaults[lowerId] || 0;
  },

  addAdditionalSurcharge: (surcharge) => {
    const item: AdditionalSurcharge = {
      ...surcharge,
      id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    const items = [...get().additionalSurcharges, item];
    set({ additionalSurcharges: items });
    saveAdditional(items);
  },

  updateAdditionalSurcharge: (id, updates) => {
    const items = get().additionalSurcharges.map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    set({ additionalSurcharges: items });
    saveAdditional(items);
  },

  removeAdditionalSurcharge: (id) => {
    const items = get().additionalSurcharges.filter((p) => p.id !== id);
    set({ additionalSurcharges: items });
    saveAdditional(items);
  },

  getAdditionalSurchargeTotal: (carrierId, countryCode) => {
    const lowerId = carrierId.toLowerCase();
    return get()
      .additionalSurcharges.filter(
        (p) => p.carrierId.toLowerCase() === lowerId && p.countryCode === countryCode && isSurchargeActive(p)
      )
      .reduce((sum, p) => sum + p.amount, 0);
  },

  getAdditionalSurchargesByCarrier: (carrierId) => {
    const lowerId = carrierId.toLowerCase();
    return get().additionalSurcharges.filter((p) => p.carrierId.toLowerCase() === lowerId);
  },
}));
