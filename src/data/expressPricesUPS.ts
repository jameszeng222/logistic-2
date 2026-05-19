import type { ExpressPriceTier } from "./expressPriceTypes";

// UPS 价格表 - 无分区，所有国家统一价格
// 来源: 用户提供的报价表
export const upsPriceTable: ExpressPriceTier[] = [
  { weight: 0.5, zonePrices: { "1": 137.81 } },
  { weight: 1.0, zonePrices: { "1": 143.12 } },
  { weight: 1.5, zonePrices: { "1": 231.76 } },
  { weight: 2.0, zonePrices: { "1": 276.52 } },
  { weight: 2.5, zonePrices: { "1": 321.32 } },
  { weight: 3.0, zonePrices: { "1": 369.56 } },
  { weight: 3.5, zonePrices: { "1": 415.01 } },
  { weight: 4.0, zonePrices: { "1": 459.14 } },
  { weight: 4.5, zonePrices: { "1": 503.95 } },
  { weight: 5.0, zonePrices: { "1": 548.77 } },
  { weight: 5.5, zonePrices: { "1": 646.58 } },
  { weight: 6.0, zonePrices: { "1": 696.12 } },
  { weight: 6.5, zonePrices: { "1": 744.93 } },
  { weight: 7.0, zonePrices: { "1": 794.10 } },
  { weight: 7.5, zonePrices: { "1": 842.93 } },
  { weight: 8.0, zonePrices: { "1": 892.42 } },
  { weight: 8.5, zonePrices: { "1": 942.25 } },
  { weight: 9.0, zonePrices: { "1": 991.39 } },
  { weight: 9.5, zonePrices: { "1": 1039.56 } },
  { weight: 10.0, zonePrices: { "1": 1088.34 } },
  { weight: 10.5, zonePrices: { "1": 1104.50 } },
  { weight: 11.0, zonePrices: { "1": 1142.69 } },
  { weight: 11.5, zonePrices: { "1": 1179.44 } },
  { weight: 12.0, zonePrices: { "1": 1216.23 } },
  { weight: 12.5, zonePrices: { "1": 1253.36 } },
  { weight: 13.0, zonePrices: { "1": 1289.80 } },
  { weight: 13.5, zonePrices: { "1": 1327.60 } },
  { weight: 14.0, zonePrices: { "1": 1365.07 } },
  { weight: 14.5, zonePrices: { "1": 1402.24 } },
  { weight: 15.0, zonePrices: { "1": 1437.96 } },
  { weight: 15.5, zonePrices: { "1": 1476.45 } },
  { weight: 16.0, zonePrices: { "1": 1513.28 } },
  { weight: 16.5, zonePrices: { "1": 1550.05 } },
  { weight: 17.0, zonePrices: { "1": 1587.52 } },
  { weight: 17.5, zonePrices: { "1": 1625.34 } },
  { weight: 18.0, zonePrices: { "1": 1662.13 } },
  { weight: 18.5, zonePrices: { "1": 1697.51 } },
  { weight: 19.0, zonePrices: { "1": 1738.74 } },
  { weight: 19.5, zonePrices: { "1": 1782.74 } },
  { weight: 20.0, zonePrices: { "1": 1826.42 } },
];

export function getUpsPriceTable(): ExpressPriceTier[] {
  return upsPriceTable;
}
