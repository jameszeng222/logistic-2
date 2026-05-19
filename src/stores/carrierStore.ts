import { create } from "zustand";
import type { Carrier } from "@/types";
import { carriers as defaultCarriers } from "@/data/carriers";
import { loadAllData } from "@/services/dataService";

interface CarrierState {
  carriers: Carrier[];
  isLoading: boolean;
  lastSync: string | null;
  addCarrier: (carrier: Omit<Carrier, "id"> & { id?: string }) => void;
  updateCarrier: (id: string, updates: Partial<Carrier>) => void;
  deleteCarrier: (id: string) => void;
  getCarrierById: (id: string) => Carrier | undefined;
  syncFromServer: () => Promise<void>;
}

const STORAGE_KEY = "logistics_carriers_v1";

function loadCarriers(): Carrier[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((carrier: any) => ({
        ...carrier,
        id: typeof carrier.id === 'string' ? carrier.id.toLowerCase() : carrier.id,
      }));
    }
  } catch {}
  return JSON.parse(JSON.stringify(defaultCarriers));
}

function saveCarriers(carriers: Carrier[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carriers));
  } catch {}
}

export const useCarrierStore = create<CarrierState>((set, get) => ({
  carriers: loadCarriers(),
  isLoading: false,
  lastSync: null,

  addCarrier: (carrier) => {
    const newCarrier: Carrier = {
      ...carrier,
      id: (carrier.id || `carrier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).toLowerCase(),
    };
    const updated = [...get().carriers, newCarrier];
    set({ carriers: updated });
    saveCarriers(updated);
  },

  updateCarrier: (id, updates) => {
    const lowerId = id.toLowerCase();
    const updated = get().carriers.map((c) =>
      c.id.toLowerCase() === lowerId ? { ...c, ...updates } : c
    );
    set({ carriers: updated });
    saveCarriers(updated);
  },

  deleteCarrier: (id) => {
    const lowerId = id.toLowerCase();
    const updated = get().carriers.filter((c) => c.id.toLowerCase() !== lowerId);
    set({ carriers: updated });
    saveCarriers(updated);
  },

  getCarrierById: (id) => {
    const lowerId = id.toLowerCase();
    return get().carriers.find((c) => c.id.toLowerCase() === lowerId);
  },

  syncFromServer: async () => {
    set({ isLoading: true });
    try {
      const data = await loadAllData();
      if (data.carriers && data.carriers.length > 0) {
        set({
          carriers: data.carriers,
          lastSync: data.metadata.lastSync,
        });
        saveCarriers(data.carriers);
      }
    } catch (error) {
      console.error("Failed to sync carriers:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
