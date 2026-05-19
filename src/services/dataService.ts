import type { Carrier, ExpressPriceTier, Surcharge } from "@/types";

const DATA_URL = "/data";

export interface SyncData {
  carriers: Carrier[];
  zones: Record<string, Record<string, string>>;
  dhlPrices: ExpressPriceTier[];
  fedexPrices: ExpressPriceTier[];
  upsPrices: ExpressPriceTier[];
  fuelSurcharges: Array<{
    carrierId: string;
    rate: number;
    effectiveDate: string;
    expiryDate: string;
  }>;
  additionalSurcharges: Surcharge[];
  yuntuRates: Array<{
    carrierId: string;
    countryCode: string;
    countryName: string;
    weightStart: number;
    weightEnd: number;
    unitPrice: number;
    registrationFee: number;
  }>;
  metadata: {
    lastSync: string;
    recordCounts: Record<string, number>;
  };
}

let cachedData: SyncData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute in-memory cache

async function fetchJson<T>(filename: string): Promise<T> {
  const response = await fetch(`${DATA_URL}/${filename}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to load ${filename}: ${response.status}`);
  }
  return response.json();
}

export async function loadAllData(): Promise<SyncData> {
  const now = Date.now();
  if (cachedData && now - lastFetchTime < CACHE_DURATION) {
    return cachedData;
  }

  const [
    carriers,
    zones,
    dhlPrices,
    fedexPrices,
    upsPrices,
    fuelSurchargesRaw,
    additionalSurchargesRaw,
    yuntuRatesRaw,
    metadataRaw,
  ] = await Promise.all([
    fetchJson<Carrier[]>("carriers.json"),
    fetchJson<Record<string, Record<string, string>>>("zones.json"),
    fetchJson<ExpressPriceTier[]>("dhl-prices.json"),
    fetchJson<ExpressPriceTier[]>("fedex-prices.json"),
    fetchJson<ExpressPriceTier[]>("ups-prices.json"),
    fetchJson("fuel-surcharges.json"),
    fetchJson("additional-surcharges.json"),
    fetchJson("yuntu-rates.json"),
    fetchJson("metadata.json"),
  ]);

  cachedData = {
    carriers,
    zones,
    dhlPrices,
    fedexPrices,
    upsPrices,
    fuelSurcharges: fuelSurchargesRaw as any,
    additionalSurcharges: additionalSurchargesRaw as any,
    yuntuRates: yuntuRatesRaw as any,
    metadata: metadataRaw as any,
  };
  lastFetchTime = now;

  return cachedData;
}

export function getCachedData(): SyncData | null {
  return cachedData;
}

export function clearCache() {
  cachedData = null;
  lastFetchTime = 0;
}
