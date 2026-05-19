export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

export function formatWeight(weight: number): string {
  return `${weight.toFixed(3)} kg`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
