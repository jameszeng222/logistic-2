// 快递价格表类型定义
export interface ExpressPriceTier {
  weight: number;
  zonePrices: Record<string, number>;
}
