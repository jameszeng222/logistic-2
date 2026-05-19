export interface FuelSurcharge {
  carrierId: string;
  rate: number;
  effectiveDate?: string;
  note?: string;
}

export interface AdditionalSurcharge {
  id: string;
  carrierId: string;
  countryCode: string;
  name: string;
  amount: number;
  startDate?: string;
  endDate?: string;
  isPermanent: boolean;
  note?: string;
}

export interface SurchargeState {
  fuelSurcharges: FuelSurcharge[];
  additionalSurcharges: AdditionalSurcharge[];
}
