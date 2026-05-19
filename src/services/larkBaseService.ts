import type { Carrier, ExpressPriceTier, Surcharge } from "@/types";

const BASE_TOKEN = "CEqSb9DltajJ1Dsax54c4UT9n7c";
const TABLE_IDS = {
  carriers: "tblKMO4ICBiBaFZD",
  yuntuRates: "tblRW31dQmIXd4m1",
  dhlPrices: "tbls1wHuCiGmSdCq",
  fedexPrices: "tblcDu3ZSgCGHqvm",
  upsPrices: "tblGQjHqkCLWPzcT",
  zones: "tblRPQcNyWVts9zI",
  fuelSurcharges: "tblI0yajPhIznBeS",
  additionalSurcharges: "tbl2xi7GdQ1s2kGL",
};

const CACHE_KEY = "lark_base_cache_v1";
const CACHE_TIMESTAMP_KEY = "lark_base_cache_time_v1";
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes cache

interface CacheData {
  carriers: Carrier[];
  yuntuRates: any[];
  dhlPrices: ExpressPriceTier[];
  fedexPrices: ExpressPriceTier[];
  upsPrices: ExpressPriceTier[];
  zones: any[];
  fuelSurcharges: any[];
  additionalSurcharges: Surcharge[];
}

function getCache(): CacheData | null {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return null;
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION_MS) return null;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return null;
}

function setCache(data: CacheData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
  } catch {}
}

async function fetchRecords(tableId: string, limit: number = 500): Promise<any[]> {
  const records: any[] = [];
  let hasMore = true;
  let pageToken = "";

  while (hasMore && records.length < limit) {
    const params = new URLSearchParams();
    params.append("page_size", String(Math.min(200, limit - records.length)));
    if (pageToken) params.append("page_token", pageToken);

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${tableId}/records?${params}`,
      {
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
        },
      }
    );

    const data = await response.json();
    if (data.code !== 0) {
      console.error("Lark API error:", data);
      break;
    }

    records.push(...(data.data?.items || []));
    hasMore = data.data?.has_more || false;
    pageToken = data.data?.page_token || "";
  }

  return records;
}

async function getAccessToken(): Promise<string> {
  // For now, return a placeholder. In production, this should be handled by a backend proxy
  // to avoid exposing app credentials in the frontend.
  // We'll implement a simple proxy or use a public read-only token approach.
  const cached = sessionStorage.getItem("lark_access_token");
  if (cached) return cached;

  // Since we can't safely store app credentials in frontend,
  // we'll need to either:
  // 1. Use a backend proxy
  // 2. Use a public share link approach
  // 3. Have users authenticate with their own Feishu account

  // For now, throw an error to indicate this needs backend support
  throw new Error("Direct Feishu API access from frontend requires backend proxy. Please implement a proxy server or use the local data fallback.");
}

export async function syncAllData(): Promise<CacheData> {
  const cached = getCache();
  if (cached) {
    console.log("[LarkBase] Using cached data");
    return cached;
  }

  console.log("[LarkBase] Fetching fresh data from Feishu...");

  try {
    const [
      carriers,
      yuntuRates,
      dhlPrices,
      fedexPrices,
      upsPrices,
      zones,
      fuelSurcharges,
      additionalSurcharges,
    ] = await Promise.all([
      fetchRecords(TABLE_IDS.carriers),
      fetchRecords(TABLE_IDS.yuntuRates),
      fetchRecords(TABLE_IDS.dhlPrices),
      fetchRecords(TABLE_IDS.fedexPrices),
      fetchRecords(TABLE_IDS.upsPrices),
      fetchRecords(TABLE_IDS.zones),
      fetchRecords(TABLE_IDS.fuelSurcharges),
      fetchRecords(TABLE_IDS.additionalSurcharges),
    ]);

    const data: CacheData = {
      carriers: carriers.map((r) => ({
        id: r.fields["渠道ID"],
        name: r.fields["渠道名称"],
        code: r.fields["渠道代码"],
        logo: "",
        description: "",
        volumetricFactor: r.fields["体积系数"] || 5000,
        services: [r.fields["服务类型"]],
        color: r.fields["颜色"] || "#3E2349",
        billingMode: r.fields["计费模式"] || "yuntu",
      })),
      yuntuRates: yuntuRates.map((r) => ({
        carrierId: r.fields["渠道ID"],
        countryCode: r.fields["国家代码"],
        countryName: r.fields["国家名称"],
        weightStart: r.fields["重量起"],
        weightEnd: r.fields["重量止"],
        unitPrice: r.fields["单价"],
        registrationFee: r.fields["挂号费"],
      })),
      dhlPrices: dhlPrices.map((r) => ({
        weight: r.fields["重量"],
        zonePrices: {
          "1": r.fields["分区1"] || 0,
          "2": r.fields["分区2"] || 0,
          "3": r.fields["分区3"] || 0,
          "4": r.fields["分区4"] || 0,
          "5": r.fields["分区5"] || 0,
          "6": r.fields["分区6"] || 0,
          "7": r.fields["分区7"] || 0,
          "8": r.fields["分区8"] || 0,
          "9": r.fields["分区9"] || 0,
        },
      })),
      fedexPrices: fedexPrices.map((r) => ({
        weight: r.fields["重量"],
        zonePrices: {
          "2": r.fields["分区2"] || 0,
          A: r.fields["分区A"] || 0,
          B: r.fields["分区B"] || 0,
          D: r.fields["分区D"] || 0,
          E: r.fields["分区E"] || 0,
          F: r.fields["分区F"] || 0,
          G: r.fields["分区G"] || 0,
          H: r.fields["分区H"] || 0,
          K: r.fields["分区K"] || 0,
          M: r.fields["分区M"] || 0,
          N: r.fields["分区N"] || 0,
          O: r.fields["分区O"] || 0,
          P: r.fields["分区P"] || 0,
          Q: r.fields["分区Q"] || 0,
          R: r.fields["分区R"] || 0,
          S: r.fields["分区S"] || 0,
          T: r.fields["分区T"] || 0,
          U: r.fields["分区U"] || 0,
          V: r.fields["分区V"] || 0,
          X: r.fields["分区X"] || 0,
          Y: r.fields["分区Y"] || 0,
          Z: r.fields["分区Z"] || 0,
        },
      })),
      upsPrices: upsPrices.map((r) => ({
        weight: r.fields["重量"],
        zonePrices: {
          "1": r.fields["分区1"] || 0,
        },
      })),
      zones: zones.map((r) => ({
        carrier: r.fields["渠道"],
        countryCode: r.fields["国家代码"],
        countryName: r.fields["国家名称"],
        zone: r.fields["分区"],
      })),
      fuelSurcharges: fuelSurcharges.map((r) => ({
        carrierId: r.fields["渠道ID"],
        rate: r.fields["费率"] || 0,
        effectiveDate: r.fields["生效日期"],
        expiryDate: r.fields["失效日期"],
      })),
      additionalSurcharges: additionalSurcharges.map((r) => ({
        carrierId: r.fields["渠道ID"],
        countryCode: r.fields["国家代码"],
        name: r.fields["附加费名称"],
        amount: r.fields["金额"] || 0,
        billingMethod: r.fields["计费方式"] || "per_kg",
        effectiveDate: r.fields["生效日期"],
        expiryDate: r.fields["失效日期"],
      })),
    };

    setCache(data);
    return data;
  } catch (error) {
    console.error("[LarkBase] Failed to fetch from Feishu:", error);
    // Return cached data even if expired, or throw if no cache
    if (cached) return cached;
    throw error;
  }
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP_KEY);
}

export function getCachedData(): CacheData | null {
  return getCache();
}
