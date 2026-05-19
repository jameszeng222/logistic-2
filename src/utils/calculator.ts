import type { Carrier, Country, CarrierCountryRate, QueryParams, QueryResult } from "@/types";
import { countries } from "@/data/countries";
import { getZone, getDefaultZone } from "@/data/expressZones";
import { getPriceTable } from "@/data/expressPrices";
import type { ExpressPriceTier } from "@/data/expressPriceTypes";

export function calculateVolumetricWeight(
  length: number,
  width: number,
  height: number,
  volumetricFactor: number
): number {
  if (length <= 0 || width <= 0 || height <= 0) return 0;
  return parseFloat(((length * width * height) / volumetricFactor).toFixed(3));
}

export function getChargeableWeight(
  actualWeight: number,
  volumetricWeight: number
): number {
  return Math.max(actualWeight, volumetricWeight);
}

export function roundUpToHalfKg(weight: number): number {
  return Math.ceil(weight * 2) / 2;
}

export function findYuntuTier(
  rate: CarrierCountryRate,
  weight: number
) {
  if (!rate.yuntuTiers) return null;
  return rate.yuntuTiers.find(
    (t) => weight >= t.weightFrom && weight <= t.weightTo
  ) || null;
}

export function calculateYuntuCost(
  tier: { unitPrice: number; registrationFee: number },
  chargeableWeight: number
): { basePrice: number; registrationFee: number; totalPrice: number } {
  const basePrice = parseFloat((chargeableWeight * tier.unitPrice).toFixed(2));
  const registrationFee = tier.registrationFee;
  const totalPrice = parseFloat((basePrice + registrationFee).toFixed(2));

  return { basePrice, registrationFee, totalPrice };
}

export function calculateExpressCost(
  fuelSurchargeRate: number,
  weight: number,
  basePrice: number,
  additionalSurcharge: number = 0
): { basePrice: number; additionalSurcharge: number; fuelSurcharge: number; totalPrice: number } {
  // 确保所有输入都是数字
  const numericBasePrice = typeof basePrice === 'number' ? basePrice : parseFloat(basePrice as string) || 0;
  const numericAdditionalSurcharge = typeof additionalSurcharge === 'number' ? additionalSurcharge : parseFloat(additionalSurcharge as string) || 0;
  const numericFuelRate = typeof fuelSurchargeRate === 'number' ? fuelSurchargeRate : parseFloat(fuelSurchargeRate as string) || 0;

  const subtotal = numericBasePrice + numericAdditionalSurcharge;
  const fuelSurcharge = parseFloat((subtotal * numericFuelRate).toFixed(2));
  const totalPrice = parseFloat((subtotal + fuelSurcharge).toFixed(2));

  return { basePrice: numericBasePrice, additionalSurcharge: numericAdditionalSurcharge, fuelSurcharge, totalPrice };
}

export function getEstimatedDays(rate: CarrierCountryRate): string {
  const { min, max } = rate.estimatedDays;
  return `${min}-${max} 天`;
}

export function getServiceType(carrier: Carrier): string {
  return carrier.services[0] || "标准服务";
}

export function findExpressPrice(
  carrierId: string,
  countryCode: string,
  weight: number,
  priceTable: ExpressPriceTier[]
): number {
  const zone = getZone(carrierId, countryCode);
  if (priceTable.length === 0) {
    console.warn(`[findExpressPrice] priceTable is empty for carrier=${carrierId}, country=${countryCode}`);
    return 0;
  }

  const roundedWeight = roundUpToHalfKg(weight);
  const tier = priceTable.find((t) => Math.abs(t.weight - roundedWeight) < 0.001);

  // zonePrices 是 Record<string, number>，直接用 zone 作为 key 查询
  const effectiveZone = zone || getDefaultZone(carrierId);

  console.log(`[findExpressPrice] carrier=${carrierId}, country=${countryCode}, zone=${zone}, effectiveZone=${effectiveZone}, weight=${weight}, roundedWeight=${roundedWeight}, tierFound=${!!tier}`);
  if (tier) {
    console.log(`[findExpressPrice] tier.zonePrices keys=`, Object.keys(tier.zonePrices));
    console.log(`[findExpressPrice] price for zone ${effectiveZone}=`, tier.zonePrices[effectiveZone]);
  }

  let price: number;
  if (!tier) {
    const last = priceTable[priceTable.length - 1];
    price = last.zonePrices[effectiveZone] ?? 0;
  } else {
    price = tier.zonePrices[effectiveZone] ?? 0;
  }
  // 确保返回的是数字
  return typeof price === 'number' ? price : parseFloat(price as string) || 0;
}

export function queryRates(
  params: QueryParams,
  rates: CarrierCountryRate[],
  carriers: Carrier[],
  expressPriceStore?: { getTable: (carrierId: string) => ExpressPriceTier[] },
  fuelSurchargeRates?: Record<string, number>,
  additionalSurcharges?: Record<string, number>
): QueryResult[] {
  const country = countries.find((c) => c.code === params.countryCode);
  if (!country) return [];

  const results: QueryResult[] = [];

  params.selectedCarriers.forEach((carrierId) => {
    const lowerId = carrierId.toLowerCase();
    const carrier = carriers.find((c) => c.id.toLowerCase() === lowerId);
    if (!carrier) return;

    const volumetricWeight = calculateVolumetricWeight(
      params.length,
      params.width,
      params.height,
      carrier.volumetricFactor
    );

    const chargeableWeight = getChargeableWeight(params.weight, volumetricWeight);

    const rate = rates.find(
      (r) => r.carrierId.toLowerCase() === lowerId && r.countryCode === params.countryCode
    );

    if (!rate) return;

    if (carrier.billingMode === "yuntu") {
      const tier = findYuntuTier(rate, chargeableWeight);
      if (!tier) return;

      const { basePrice, registrationFee, totalPrice } = calculateYuntuCost(
        tier,
        chargeableWeight
      );

      results.push({
        carrierId: carrier.id,
        carrierName: carrier.name,
        carrierColor: carrier.color,
        chargeableWeight,
        volumetricWeight,
        actualWeight: params.weight,
        basePrice,
        registrationFee,
        additionalFee: 0,
        fuelSurcharge: 0,
        totalPrice,
        estimatedDays: getEstimatedDays(rate),
        serviceType: getServiceType(carrier),
      });
    } else {
      const expressWeight = roundUpToHalfKg(chargeableWeight);
      const priceTable = expressPriceStore?.getTable(carrierId) ?? getPriceTable(carrierId);
      const zone = getZone(carrierId, params.countryCode);
      console.log(`[queryRates] carrier=${carrierId}, country=${params.countryCode}, zone=${zone}, expressWeight=${expressWeight}, priceTableLength=${priceTable.length}`);
      if (priceTable.length > 0) {
        console.log(`[queryRates] first tier weight=${priceTable[0].weight}, keys=${Object.keys(priceTable[0].zonePrices)}`);
      }
      const baseUnitPrice = findExpressPrice(carrierId, params.countryCode, expressWeight, priceTable);

      const lookupCarrierId = carrierId.toLowerCase();
      const rawFuelRate = fuelSurchargeRates?.[lookupCarrierId] ?? 0.18;
      const fuelRate = typeof rawFuelRate === 'number' ? rawFuelRate : parseFloat(rawFuelRate as string) || 0.18;
      const addKey = `${lookupCarrierId}_${params.countryCode}`;
      const rawAddAmount = additionalSurcharges?.[addKey] || 0;
      const addAmount = typeof rawAddAmount === 'number' ? rawAddAmount : parseFloat(rawAddAmount as string) || 0;

      const { basePrice, additionalSurcharge, fuelSurcharge, totalPrice } = calculateExpressCost(
        fuelRate,
        expressWeight,
        baseUnitPrice,
        addAmount
      );

      results.push({
        carrierId: carrier.id,
        carrierName: carrier.name,
        carrierColor: carrier.color,
        chargeableWeight,
        volumetricWeight,
        actualWeight: params.weight,
        basePrice,
        registrationFee: 0,
        additionalFee: additionalSurcharge,
        fuelSurcharge,
        totalPrice,
        estimatedDays: getEstimatedDays(rate),
        serviceType: getServiceType(carrier),
        zone: zone || getDefaultZone(carrierId),
      });
    }
  });

  return results.sort((a, b) => a.totalPrice - b.totalPrice);
}

export function getBestRecommendation(results: QueryResult[]): QueryResult | null {
  if (results.length === 0) return null;
  return results[0];
}

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}
