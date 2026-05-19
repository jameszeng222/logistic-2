import { create } from "zustand";
import { dhlPriceTable } from "@/data/expressPrices";
import type { ExpressPriceTier } from "@/data/expressPriceTypes";
import { fedExPriceTable } from "@/data/expressPricesFedEx";
import { upsPriceTable } from "@/data/expressPricesUPS";

type PriceTableStore = {
  tables: Record<string, ExpressPriceTier[]>;
  setTable: (carrierId: string, tiers: ExpressPriceTier[]) => void;
  getTable: (carrierId: string) => ExpressPriceTier[];
  resetToDefault: (carrierId: string) => void;
};

const STORAGE_KEY = "logistics_express_prices_v2";

function loadTables(): Record<string, ExpressPriceTier[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 确保所有数据都是正确的类型
      const result: Record<string, ExpressPriceTier[]> = {};
      for (const [key, tiers] of Object.entries(parsed)) {
        if (!Array.isArray(tiers)) continue;
        result[key] = tiers.map((tier: any) => ({
          weight: typeof tier.weight === 'number' ? tier.weight : parseFloat(tier.weight) || 0,
          zonePrices: Object.fromEntries(
            Object.entries(tier.zonePrices || {}).map(([zone, price]) => [
              zone,
              typeof price === 'number' ? price : parseFloat(price as string) || 0
            ])
          )
        }));
      }
      return result;
    }
  } catch {}
  return {};
}

function saveTables(tables: Record<string, ExpressPriceTier[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {}
}

export const useExpressPriceStore = create<PriceTableStore>((set, get) => ({
  tables: loadTables(),

  setTable: (carrierId, tiers) => {
    const updated = { ...get().tables, [carrierId]: tiers };
    set({ tables: updated });
    saveTables(updated);
  },

  getTable: (carrierId) => {
    const tables = get().tables;
    // 尝试直接匹配
    if (tables[carrierId] && tables[carrierId].length > 0) {
      return tables[carrierId];
    }
    // 尝试小写匹配
    const lowerId = carrierId.toLowerCase();
    for (const [key, value] of Object.entries(tables)) {
      if (key.toLowerCase() === lowerId && value.length > 0) {
        return value;
      }
    }
    return getDefaultTable(carrierId);
  },

  resetToDefault: (carrierId) => {
    const updated = { ...get().tables };
    const lowerId = carrierId.toLowerCase();
    // 删除所有大小写变体的键
    for (const key of Object.keys(updated)) {
      if (key.toLowerCase() === lowerId) {
        delete updated[key];
      }
    }
    set({ tables: updated });
    saveTables(updated);
  },
}));

function getDefaultTable(carrierId: string): ExpressPriceTier[] {
  const id = carrierId.toLowerCase();
  if (id === "dhl") return dhlPriceTable;
  if (id === "fedex") return fedExPriceTable;
  if (id === "ups") return upsPriceTable;
  return [];
}
