import { create } from "zustand";
import type { CarrierCountryRate, YuntuWeightTier } from "@/types";
import { defaultCarrierCountryRates } from "@/data/carrierCountryRates";

interface RateState {
  rates: CarrierCountryRate[];
  selectedCarrier: string;
  selectedCountry: string;
  setRates: (rates: CarrierCountryRate[]) => void;
  addRate: (rate: CarrierCountryRate) => void;
  updateYuntuTiers: (carrierId: string, countryCode: string, tiers: YuntuWeightTier[], estimatedDays: { min: number; max: number }) => void;
  updateEstimatedDays: (carrierId: string, countryCode: string, estimatedDays: { min: number; max: number }) => void;
  deleteRate: (carrierId: string, countryCode: string) => void;
  setSelectedCarrier: (carrier: string) => void;
  setSelectedCountry: (country: string) => void;
  getRate: (carrierId: string, countryCode: string) => CarrierCountryRate | undefined;
  getFilteredRates: () => CarrierCountryRate[];
  resetToDefault: () => void;
  batchUpdateYuntuRates: (updates: { carrierId: string; countryCode: string; tiers: YuntuWeightTier[]; estimatedDays: { min: number; max: number } }[]) => void;
}

const STORAGE_KEY = "logistics_rates_v6";

function loadRates(): CarrierCountryRate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 确保所有数值都是数字类型
      return parsed.map((rate: any) => ({
        ...rate,
        yuntuTiers: rate.yuntuTiers?.map((tier: any) => ({
          ...tier,
          weightFrom: typeof tier.weightFrom === 'number' ? tier.weightFrom : parseFloat(tier.weightFrom) || 0,
          weightTo: typeof tier.weightTo === 'number' ? tier.weightTo : parseFloat(tier.weightTo) || 0,
          unitPrice: typeof tier.unitPrice === 'number' ? tier.unitPrice : parseFloat(tier.unitPrice) || 0,
          registrationFee: typeof tier.registrationFee === 'number' ? tier.registrationFee : parseFloat(tier.registrationFee) || 0,
        }))
      }));
    }
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(defaultCarrierCountryRates));
}

function saveRates(rates: CarrierCountryRate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
  } catch {
    // ignore
  }
}

export const useRateStore = create<RateState>((set, get) => ({
  rates: loadRates(),
  selectedCarrier: "",
  selectedCountry: "",

  setRates: (rates) => {
    set({ rates });
    saveRates(rates);
  },

  addRate: (rate) => {
    const updated = [...get().rates, rate];
    set({ rates: updated });
    saveRates(updated);
  },

  updateYuntuTiers: (carrierId, countryCode, tiers, estimatedDays) => {
    const lowerCarrierId = carrierId.toLowerCase();
    const rates = get().rates;
    const existingIndex = rates.findIndex(
      (r) => r.carrierId.toLowerCase() === lowerCarrierId && r.countryCode === countryCode
    );
    let updated: CarrierCountryRate[];
    if (existingIndex >= 0) {
      updated = rates.map((r, i) =>
        i === existingIndex ? { ...r, yuntuTiers: tiers, estimatedDays } : r
      );
    } else {
      updated = [...rates, { carrierId: lowerCarrierId, countryCode, yuntuTiers: tiers, estimatedDays }];
    }
    set({ rates: updated });
    saveRates(updated);
  },

  updateEstimatedDays: (carrierId, countryCode, estimatedDays) => {
    const lowerCarrierId = carrierId.toLowerCase();
    const rates = get().rates;
    const existingIndex = rates.findIndex(
      (r) => r.carrierId.toLowerCase() === lowerCarrierId && r.countryCode === countryCode
    );
    let updated: CarrierCountryRate[];
    if (existingIndex >= 0) {
      updated = rates.map((r, i) =>
        i === existingIndex ? { ...r, estimatedDays } : r
      );
    } else {
      updated = [...rates, { carrierId: lowerCarrierId, countryCode, estimatedDays }];
    }
    set({ rates: updated });
    saveRates(updated);
  },

  deleteRate: (carrierId, countryCode) => {
    const lowerCarrierId = carrierId.toLowerCase();
    const updated = get().rates.filter(
      (r) => !(r.carrierId.toLowerCase() === lowerCarrierId && r.countryCode === countryCode)
    );
    set({ rates: updated });
    saveRates(updated);
  },

  setSelectedCarrier: (carrier) => set({ selectedCarrier: carrier }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),

  getRate: (carrierId, countryCode) => {
    const lowerCarrierId = carrierId.toLowerCase();
    return get().rates.find(
      (r) => r.carrierId.toLowerCase() === lowerCarrierId && r.countryCode === countryCode
    );
  },

  getFilteredRates: () => {
    const { rates, selectedCarrier, selectedCountry } = get();
    return rates.filter((r) => {
      if (selectedCarrier && r.carrierId.toLowerCase() !== selectedCarrier.toLowerCase()) return false;
      if (selectedCountry && r.countryCode !== selectedCountry) return false;
      return true;
    });
  },

  resetToDefault: () => {
    const defaultRates = JSON.parse(JSON.stringify(defaultCarrierCountryRates));
    set({ rates: defaultRates });
    saveRates(defaultRates);
  },

  batchUpdateYuntuRates: (updates) => {
    let currentRates = [...get().rates];

    for (const update of updates) {
      const lowerCarrierId = update.carrierId.toLowerCase();
      const existingIndex = currentRates.findIndex(
        (r) => r.carrierId.toLowerCase() === lowerCarrierId && r.countryCode === update.countryCode
      );

      if (existingIndex >= 0) {
        currentRates = currentRates.map((r, i) =>
          i === existingIndex
            ? { ...r, yuntuTiers: update.tiers, estimatedDays: update.estimatedDays }
            : r
        );
      } else {
        currentRates.push({
          carrierId: lowerCarrierId,
          countryCode: update.countryCode,
          yuntuTiers: update.tiers,
          estimatedDays: update.estimatedDays,
        });
      }
    }

    set({ rates: currentRates });
    saveRates(currentRates);
  },
}));
