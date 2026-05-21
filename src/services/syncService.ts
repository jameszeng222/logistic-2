import { useCarrierStore } from "@/stores/carrierStore";
import { useRateStore } from "@/stores/rateStore";
import { useExpressPriceStore } from "@/stores/expressPriceStore";
import { useSurchargeStore } from "@/stores/surchargeStore";

const DATA_URL = import.meta.env.BASE_URL + "data/";

interface SyncData {
  carriers: any[];
  zones: { dhl: Record<string, string>; fedex: Record<string, string>; ups: Record<string, string> };
  dhlPrices: any[];
  fedexPrices: any[];
  upsPrices: any[];
  fuelSurcharges: any[];
  additionalSurcharges: any[];
  yuntuRates: any[];
  metadata: { lastSync: string };
}

// 加载同步数据
export async function loadSyncData(): Promise<SyncData | null> {
  try {
    const response = await fetch(`${DATA_URL}metadata.json?t=${Date.now()}`);
    if (!response.ok) {
      console.log("No sync data found, using defaults");
      return null;
    }

    const metadata = await response.json();
    const lastSync = metadata.lastSync;
    const storedSync = localStorage.getItem("last_data_sync");

    // 如果本地数据已经是最新的，跳过加载
    if (storedSync === lastSync) {
      console.log("Data is up to date, skipping sync");
      return null;
    }

    console.log("Loading synced data from:", DATA_URL);

    // 并行加载所有数据文件
    const [
      carriersRes,
      zonesRes,
      dhlPricesRes,
      fedexPricesRes,
      upsPricesRes,
      fuelRes,
      additionalRes,
      yuntuRes,
    ] = await Promise.all([
      fetch(`${DATA_URL}carriers.json?t=${Date.now()}`),
      fetch(`${DATA_URL}zones.json?t=${Date.now()}`),
      fetch(`${DATA_URL}dhl-prices.json?t=${Date.now()}`),
      fetch(`${DATA_URL}fedex-prices.json?t=${Date.now()}`),
      fetch(`${DATA_URL}ups-prices.json?t=${Date.now()}`),
      fetch(`${DATA_URL}fuel-surcharges.json?t=${Date.now()}`),
      fetch(`${DATA_URL}additional-surcharges.json?t=${Date.now()}`),
      fetch(`${DATA_URL}yuntu-rates.json?t=${Date.now()}`),
    ]);

    const syncData: SyncData = {
      carriers: carriersRes.ok ? await carriersRes.json() : [],
      zones: zonesRes.ok ? await zonesRes.json() : { dhl: {}, fedex: {}, ups: {} },
      dhlPrices: dhlPricesRes.ok ? await dhlPricesRes.json() : [],
      fedexPrices: fedexPricesRes.ok ? await fedexPricesRes.json() : [],
      upsPrices: upsPricesRes.ok ? await upsPricesRes.json() : [],
      fuelSurcharges: fuelRes.ok ? await fuelRes.json() : [],
      additionalSurcharges: additionalRes.ok ? await additionalRes.json() : [],
      yuntuRates: yuntuRes.ok ? await yuntuRes.json() : [],
      metadata,
    };

    return syncData;
  } catch (e) {
    console.error("Failed to load sync data:", e);
    return null;
  }
}

// 应用同步数据到各个 store
export function applySyncData(data: SyncData) {
  if (!data) return;

  // 同步物流渠道
  if (data.carriers?.length > 0) {
    const carrierStore = useCarrierStore.getState();
    data.carriers.forEach((carrier) => {
      if (carrier.id) {
        carrierStore.updateCarrier(carrier.id, {
          name: carrier.name,
          code: carrier.code,
          billingMode: carrier.billingMode,
          volumetricFactor: carrier.volumetricFactor,
          services: carrier.services || ["standard"],
          color: carrier.color,
        });
      }
    });
    console.log("✓ Carriers synced:", data.carriers.length);
  }

  // 同步快递价格表
  const priceStore = useExpressPriceStore.getState();
  if (data.dhlPrices?.length > 0) {
    priceStore.setTable("dhl", data.dhlPrices);
    console.log("✓ DHL prices synced:", data.dhlPrices.length);
  }
  if (data.fedexPrices?.length > 0) {
    priceStore.setTable("fedex", data.fedexPrices);
    console.log("✓ FedEx prices synced:", data.fedexPrices.length);
  }
  if (data.upsPrices?.length > 0) {
    priceStore.setTable("ups", data.upsPrices);
    console.log("✓ UPS prices synced:", data.upsPrices.length);
  }

  // 同步燃油附加费
  if (data.fuelSurcharges?.length > 0) {
    const surchargeStore = useSurchargeStore.getState();
    data.fuelSurcharges.forEach((item) => {
      if (item.carrierId) {
        surchargeStore.setFuelSurcharge(item.carrierId, item.rate || 0, item.note);
      }
    });
    console.log("✓ Fuel surcharges synced:", data.fuelSurcharges.length);
  }

  // 同步附加费
  if (data.additionalSurcharges?.length > 0) {
    const surchargeStore = useSurchargeStore.getState();
    // 清除旧的附加费，重新添加
    const existing = surchargeStore.additionalSurcharges;
    // 这里我们保留本地添加的，只更新来自飞书的
    data.additionalSurcharges.forEach((item) => {
      surchargeStore.addAdditionalSurcharge({
        carrierId: item.carrierId,
        countryCode: item.countryCode,
        name: item.name,
        amount: item.amount,
        startDate: item.effectiveDate,
        endDate: item.expiryDate,
        isPermanent: !item.effectiveDate && !item.expiryDate,
      });
    });
    console.log("✓ Additional surcharges synced:", data.additionalSurcharges.length);
  }

  // 同步云途运费模板
  if (data.yuntuRates?.length > 0) {
    const rateStore = useRateStore.getState();
    data.yuntuRates.forEach((rate) => {
      if (rate.carrierId && rate.countryCode) {
        rateStore.updateYuntuTiers(rate.carrierId, rate.countryCode, [
          {
            weightFrom: rate.weightStart || 0,
            weightTo: rate.weightEnd || 999999,
            unitPrice: rate.unitPrice || 0,
            registrationFee: rate.registrationFee || 0,
          }
        ], { min: 5, max: 15 });
      }
    });
    console.log("✓ Yuntu rates synced:", data.yuntuRates.length);
  }

  // 记录同步时间
  if (data.metadata?.lastSync) {
    localStorage.setItem("last_data_sync", data.metadata.lastSync);
  }

  console.log("✅ Data sync completed at:", data.metadata?.lastSync);
}

// 手动触发同步
export async function syncFromFeishu(): Promise<boolean> {
  try {
    console.log("🔄 Manual sync triggered...");
    const data = await loadSyncData();
    if (data) {
      applySyncData(data);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Sync failed:", e);
    return false;
  }
}

// 检查是否需要同步
export function shouldSync(): boolean {
  const lastSync = localStorage.getItem("last_data_sync");
  if (!lastSync) return true;

  // 如果超过1小时没有同步，建议同步
  const lastTime = new Date(lastSync).getTime();
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  return now - lastTime > oneHour;
}

// 获取上次同步时间
export function getLastSyncTime(): string | null {
  return localStorage.getItem("last_data_sync");
}
