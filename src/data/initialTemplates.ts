import type { RateTemplate } from "@/types";

interface YuntuPrice {
  unitPrice: number;
  registrationFee: number;
}

export function generateInitialTemplates(): RateTemplate[] {
  const templates: RateTemplate[] = [];

  const countryGroups: Record<string, string[]> = {
    US: ["US", "CA", "MX"],
    EU: ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "PL", "SE", "CH", "AT", "DK", "NO", "FI", "IE", "PT", "GR", "CZ", "HU", "RO"],
    ASIA: ["JP", "KR", "SG", "MY", "TH", "VN", "PH", "ID", "IN"],
    OCEANIA: ["AU", "NZ"],
    MIDDLE_EAST: ["SA", "AE", "IL", "KW", "QA", "BH", "OM", "JO", "LB"],
    AFRICA: ["ZA", "EG", "MA", "DZ", "TN", "NG", "KE"],
    SOUTH_AMERICA: ["BR", "AR", "CL", "PE", "CO", "VE", "EC"],
  };

  const yuntuWeightRanges = [
    { from: 0, to: 0.1 },
    { from: 0.1, to: 0.5 },
    { from: 0.5, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 5 },
    { from: 5, to: 10 },
    { from: 10, to: 20 },
    { from: 20, to: 30 },
  ];

  const yuntuPrices: Record<string, YuntuPrice> = {
    US: { unitPrice: 65, registrationFee: 18 },
    EU: { unitPrice: 70, registrationFee: 18 },
    ASIA: { unitPrice: 45, registrationFee: 15 },
    OCEANIA: { unitPrice: 75, registrationFee: 18 },
    MIDDLE_EAST: { unitPrice: 78, registrationFee: 18 },
    AFRICA: { unitPrice: 85, registrationFee: 20 },
    SOUTH_AMERICA: { unitPrice: 90, registrationFee: 20 },
  };

  let idCounter = 1;

  Object.entries(countryGroups).forEach(([group, countryCodes]) => {
    const yuntuPrice = yuntuPrices[group];
    if (yuntuPrice) {
      countryCodes.forEach((countryCode) => {
        yuntuWeightRanges.forEach((range) => {
          const discount = range.from >= 10 ? 0.9 : range.from >= 5 ? 0.95 : 1;
          templates.push({
            id: `template_${idCounter++}`,
            carrierId: "yuntu",
            countryCode,
            weightFrom: range.from,
            weightTo: range.to,
            basePrice: 0,
            pricePerKg: parseFloat((yuntuPrice.unitPrice * discount).toFixed(2)),
            registrationFee: parseFloat((yuntuPrice.registrationFee * discount).toFixed(2)),
          });
        });
      });
    }
  });

  return templates;
}
