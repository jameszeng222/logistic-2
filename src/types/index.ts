export interface Carrier {
  id: string;
  name: string;
  code: string;
  logo: string;
  description: string;
  volumetricFactor: number;
  services: string[];
  color: string;
  billingMode: "yuntu" | "express";
}

export interface Country {
  code: string;
  name: string;
  nameCN: string;
  region: string;
}

export interface YuntuWeightTier {
  weightFrom: number;
  weightTo: number;
  unitPrice: number;
  registrationFee: number;
}

export interface CarrierCountryRate {
  carrierId: string;
  countryCode: string;
  estimatedDays: { min: number; max: number };
  yuntuTiers?: YuntuWeightTier[];
}

export interface RateTemplate {
  id: string;
  carrierId: string;
  countryCode: string;
  weightFrom: number;
  weightTo: number;
  basePrice: number;
  pricePerKg: number;
  registrationFee: number;
}

export interface QueryParams {
  countryCode: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  selectedCarriers: string[];
}

export interface QueryResult {
  carrierId: string;
  carrierName: string;
  carrierColor: string;
  chargeableWeight: number;
  volumetricWeight: number;
  actualWeight: number;
  basePrice: number;
  registrationFee: number;
  additionalFee: number;
  fuelSurcharge: number;
  totalPrice: number;
  estimatedDays: string;
  serviceType: string;
  zone?: string;
}

export interface QueryHistory {
  id: string;
  countryCode: string;
  countryName: string;
  weight: number;
  dimensions: { l: number; w: number; h: number };
  queryTime: string;
  results: QueryResult[];
}

export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// Express price table types
export interface ExpressPriceTier {
  weight: number;
  zonePrices: Record<string, number>;
}

// Surcharge types
export interface Surcharge {
  carrierId: string;
  countryCode: string;
  name: string;
  amount: number;
  billingMethod: "per_kg" | "per_shipment" | "percentage";
  effectiveDate?: string;
  expiryDate?: string;
}
