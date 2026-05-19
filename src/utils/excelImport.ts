import * as XLSX from "xlsx";
import { countries } from "@/data/countries";
import type { YuntuWeightTier } from "@/types";

export interface ParsedExcelData {
  carrierCode: string;
  countryName: string;
  countryCode: string;
  weightFrom: number;
  weightTo: number;
  unitPrice: number;
  registrationFee: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
}

/**
 * 解析用户上传的 Excel 文件
 * 支持格式：渠道代码 | 国家/地区 | 重量起始(KG) | 重量结束(KG) | 运费(RMB/KG) | 挂号费(RMB/票) | 时效最小天数 | 时效最大天数
 */
export function parseExcelFile(file: File): Promise<ParsedExcelData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("无法读取文件内容"));
          return;
        }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        // 获取所有单元格数据，用于智能识别表头行
        const allData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          header: 1,
          defval: "",
        });

        // 找到表头行（包含"渠道代码"或"国家"或"运费"关键词的行）
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(allData.length, 15); i++) {
          const row = allData[i];
          if (!row || !Array.isArray(row)) continue;
          const rowStr = row.map((cell) => String(cell)).join(" ");
          if (
            rowStr.includes("渠道") ||
            rowStr.includes("国家") ||
            rowStr.includes("运费") ||
            rowStr.includes("重量") ||
            rowStr.includes("挂号")
          ) {
            headerRowIndex = i;
            break;
          }
        }

        // 使用表头行解析数据
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          range: headerRowIndex,
        });

        if (jsonData.length === 0) {
          reject(new Error("Excel 文件中没有数据"));
          return;
        }

        // 调试：输出第一行数据的键，帮助排查问题
        if (jsonData.length > 0) {
          console.log("Excel 解析 - 表头行索引:", headerRowIndex);
          console.log("Excel 解析 - 第一行数据键:", Object.keys(jsonData[0]));
          console.log("Excel 解析 - 第一行数据:", jsonData[0]);
        }

        const parsed: ParsedExcelData[] = [];

        for (const row of jsonData) {
          const keys = Object.keys(row);
          if (keys.length === 0) continue;

          // 智能匹配列：根据关键词找到对应的列
          const carrierCode = findCellValue(row, ["渠道代码", "渠道", "code", "渠道code"]);
          const countryName = findCellValue(row, ["国家地区", "国家/地区", "国家", "地区", "country"]);
          const weightFrom = findCellValue(row, ["重量起始", "重量起始KG", "起始重量", "weight from", "起始"]);
          const weightTo = findCellValue(row, ["重量结束", "重量结束KG", "结束重量", "weight to", "结束"]);
          const unitPrice = findCellValue(row, ["运费", "运费RMBKG", "单价", "price", "rmb/kg"]);
          const registrationFee = findCellValue(row, ["挂号费", "挂号费RMB票", "挂号", "registration", "fee"]);
          const estimatedDaysMin = findCellValue(row, ["时效最小天数", "最小天数", "min days", "时效最小"]);
          const estimatedDaysMax = findCellValue(row, ["时效最大天数", "最大天数", "max days", "时效最大"]);

          // 跳过空行（渠道代码和国家都为空）
          if (!carrierCode && !countryName) continue;

          // 清理渠道代码：去除空格、转大写
          const cleanCarrierCode = String(carrierCode || "").trim().toUpperCase();
          const cleanCountryName = String(countryName || "").trim();

          // 根据国家中文名查找国家代码
          const country = countries.find(
            (c) => c.nameCN === cleanCountryName || c.name === cleanCountryName || c.code === cleanCountryName.toUpperCase()
          );
          const resolvedCountryCode = country?.code || cleanCountryName.toUpperCase();

          parsed.push({
            carrierCode: cleanCarrierCode,
            countryName: cleanCountryName,
            countryCode: resolvedCountryCode,
            weightFrom: parseFloat(String(weightFrom || "0")),
            weightTo: parseFloat(String(weightTo || "0")),
            unitPrice: parseFloat(String(unitPrice || "0")),
            registrationFee: parseFloat(String(registrationFee || "0")),
            estimatedDaysMin: parseInt(String(estimatedDaysMin || "5"), 10),
            estimatedDaysMax: parseInt(String(estimatedDaysMax || "10"), 10),
          });
        }

        if (parsed.length === 0) {
          reject(new Error("未能从 Excel 中解析出有效数据，请检查列标题是否正确"));
          return;
        }

        // 调试：输出解析结果
        console.log("Excel 解析 - 成功解析行数:", parsed.length);
        console.log("Excel 解析 - 第一行:", parsed[0]);

        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

/**
 * 根据关键词列表，在 row 中找到匹配的单元格值
 * 支持模糊匹配，去除空格和特殊字符后比较
 */
function findCellValue(row: Record<string, unknown>, keywords: string[]): string | number | undefined {
  const rowKeys = Object.keys(row);

  for (const key of rowKeys) {
    const lowerKey = key.toLowerCase().replace(/[\s()（）KG\/\-]/g, "");
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase().replace(/[\s()（）KG\/\-]/g, "");
      if (lowerKey.includes(lowerKeyword)) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") {
          return value as string | number;
        }
      }
    }
  }

  // 如果没找到，尝试直接匹配（处理一些特殊情况）
  for (const key of rowKeys) {
    const cleanKey = key.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
    for (const keyword of keywords) {
      const cleanKeyword = keyword.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, "");
      if (cleanKey === cleanKeyword || cleanKey.includes(cleanKeyword)) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") {
          return value as string | number;
        }
      }
    }
  }

  return undefined;
}

/**
 * 生成 Excel 导入模板（适配云途报价表格式）
 */
export function generateExcelTemplate(): Blob {
  const headers = [
    "渠道代码",
    "国家/地区",
    "重量起始(KG)",
    "重量结束(KG)",
    "运费(RMB/KG)",
    "挂号费(RMB/票)",
    "时效最小天数",
    "时效最大天数",
  ];

  // 示例数据：云途标快 - 美国
  const exampleData = [
    ["YT-BK", "美国", 0, 0.1, 121, 27, 5, 10],
    ["YT-BK", "美国", 0.1, 0.2, 120, 28, 5, 10],
    ["YT-BK", "美国", 0.2, 0.3, 118, 30, 5, 10],
    ["YT-BK", "美国", 0.3, 0.45, 116, 31, 5, 10],
    ["YT-BK", "美国", 0.45, 0.9, 114, 41, 5, 10],
    ["YT-BK", "美国", 0.9, 1.35, 112, 41, 5, 10],
    ["YT-BK", "美国", 1.35, 2, 110, 41, 5, 10],
    ["YT-BK", "美国", 2, 30, 108, 41, 5, 10],
    ["", "", "", "", "", "", "", ""],
    ["YT-BK", "英国", 0, 0.1, 115, 25, 6, 12],
    ["YT-BK", "英国", 0.1, 0.5, 110, 25, 6, 12],
    ["YT-BK", "英国", 0.5, 2, 105, 25, 6, 12],
    ["YT-BK", "英国", 2, 30, 100, 25, 6, 12],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);

  // 设置列宽
  worksheet["!cols"] = [
    { wch: 12 },  // 渠道代码
    { wch: 14 },  // 国家/地区
    { wch: 16 },  // 重量起始
    { wch: 16 },  // 重量结束
    { wch: 16 },  // 运费
    { wch: 18 },  // 挂号费
    { wch: 14 },  // 时效最小
    { wch: 14 },  // 时效最大
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "云途报价导入模板");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadExcelTemplate() {
  const blob = generateExcelTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "云途报价导入模板.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 按渠道代码和国家分组
 */
export function groupByCarrierAndCountry(
  data: ParsedExcelData[]
): Map<string, ParsedExcelData[]> {
  const grouped = new Map<string, ParsedExcelData[]>();

  for (const item of data) {
    const key = `${item.carrierCode}-${item.countryCode}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  return grouped;
}

/**
 * 转换为云途重量段（按重量起始排序）
 */
export function convertToYuntuTiers(
  items: ParsedExcelData[]
): { tiers: YuntuWeightTier[]; estimatedDays: { min: number; max: number } } {
  const sorted = [...items].sort((a, b) => a.weightFrom - b.weightFrom);

  const tiers: YuntuWeightTier[] = sorted.map((item) => ({
    weightFrom: item.weightFrom,
    weightTo: item.weightTo,
    unitPrice: item.unitPrice,
    registrationFee: item.registrationFee,
  }));

  const estimatedDays = {
    min: sorted[0]?.estimatedDaysMin || 5,
    max: sorted[0]?.estimatedDaysMax || 10,
  };

  return { tiers, estimatedDays };
}

// ============ DHL 快递价格表导入 ============

export interface DhlPriceRow {
  carrierCode: string;
  weight: number;
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  zone6: number;
  zone7: number;
  zone8: number;
  zone9: number;
}

export function parseDhlPriceExcel(file: File): Promise<DhlPriceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) { reject(new Error("无法读取文件")); return; }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
          reject(new Error("Excel 文件中没有数据"));
          return;
        }

        const parsed: DhlPriceRow[] = [];
        for (const row of jsonData) {
          const carrierCode = findCellValue(row, ["渠道代码", "渠道", "code"]);
          const weight = findCellValue(row, ["重量", "重量kg", "weight", "kg"]);
          if (!carrierCode) continue;

          parsed.push({
            carrierCode: String(carrierCode).trim().toUpperCase(),
            weight: parseFloat(String(weight || "0")),
            zone1: parseFloat(String(findCellValue(row, ["1区", "1"]) || "0")),
            zone2: parseFloat(String(findCellValue(row, ["2区", "2"]) || "0")),
            zone3: parseFloat(String(findCellValue(row, ["3区", "3"]) || "0")),
            zone4: parseFloat(String(findCellValue(row, ["4区", "4"]) || "0")),
            zone5: parseFloat(String(findCellValue(row, ["5区", "5"]) || "0")),
            zone6: parseFloat(String(findCellValue(row, ["6区", "6"]) || "0")),
            zone7: parseFloat(String(findCellValue(row, ["7区", "7"]) || "0")),
            zone8: parseFloat(String(findCellValue(row, ["8区", "8"]) || "0")),
            zone9: parseFloat(String(findCellValue(row, ["9区", "9"]) || "0")),
          });
        }

        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

export function generateDhlPriceTemplate(): Blob {
  const headers = ["渠道代码", "重量(KG)", "1区", "2区", "3区", "4区", "5区", "6区", "7区", "8区", "9区"];
  const example = [
    ["DHL", 0.5, 92.52, 130.29, 117.70, 140.04, 140.36, 114.34, 121.68, 235.40, 353.09],
    ["DHL", 1.0, 112.66, 159.55, 148.85, 170.88, 184.41, 120.64, 138.47, 297.08, 431.77],
    ["DHL", 1.5, 132.80, 188.82, 180.01, 201.41, 228.47, 147.91, 158.40, 358.76, 510.44],
    ["DHL", 2.0, 152.94, 218.09, 211.16, 231.93, 272.53, 162.60, 178.33, 420.44, 589.12],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "快递价格表");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadDhlPriceTemplate() {
  const blob = generateDhlPriceTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "快递价格表导入模板.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ FedEx 快递价格表导入 ============

export interface FedExPriceRow {
  carrierCode: string;
  weight: number;
  zone2: number;
  zoneA: number;
  zoneB: number;
  zoneD: number;
  zoneE: number;
  zoneF: number;
  zoneG: number;
  zoneH: number;
  zoneK: number;
  zoneM: number;
  zoneN: number;
  zoneO: number;
  zoneP: number;
  zoneQ: number;
  zoneR: number;
  zoneS: number;
  zoneT: number;
  zoneU: number;
  zoneV: number;
  zoneX: number;
  zoneY: number;
  zoneZ: number;
}

export function parseFedExPriceExcel(file: File): Promise<FedExPriceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) { reject(new Error("无法读取文件")); return; }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
          reject(new Error("Excel 文件中没有数据"));
          return;
        }

        const parsed: FedExPriceRow[] = [];
        for (const row of jsonData) {
          const carrierCode = findCellValue(row, ["渠道代码", "渠道", "code"]);
          const weight = findCellValue(row, ["重量", "重量kg", "weight", "kg"]);
          if (!carrierCode) continue;

          parsed.push({
            carrierCode: String(carrierCode).trim().toUpperCase(),
            weight: parseFloat(String(weight || "0")),
            zone2: parseFloat(String(findCellValue(row, ["2区", "2"]) || "0")),
            zoneA: parseFloat(String(findCellValue(row, ["A区", "A"]) || "0")),
            zoneB: parseFloat(String(findCellValue(row, ["B区", "B"]) || "0")),
            zoneD: parseFloat(String(findCellValue(row, ["D区", "D"]) || "0")),
            zoneE: parseFloat(String(findCellValue(row, ["E区", "E"]) || "0")),
            zoneF: parseFloat(String(findCellValue(row, ["F区", "F"]) || "0")),
            zoneG: parseFloat(String(findCellValue(row, ["G区", "G"]) || "0")),
            zoneH: parseFloat(String(findCellValue(row, ["H区", "H"]) || "0")),
            zoneK: parseFloat(String(findCellValue(row, ["K区", "K"]) || "0")),
            zoneM: parseFloat(String(findCellValue(row, ["M区", "M"]) || "0")),
            zoneN: parseFloat(String(findCellValue(row, ["N区", "N"]) || "0")),
            zoneO: parseFloat(String(findCellValue(row, ["O区", "O"]) || "0")),
            zoneP: parseFloat(String(findCellValue(row, ["P区", "P"]) || "0")),
            zoneQ: parseFloat(String(findCellValue(row, ["Q区", "Q"]) || "0")),
            zoneR: parseFloat(String(findCellValue(row, ["R区", "R"]) || "0")),
            zoneS: parseFloat(String(findCellValue(row, ["S区", "S"]) || "0")),
            zoneT: parseFloat(String(findCellValue(row, ["T区", "T"]) || "0")),
            zoneU: parseFloat(String(findCellValue(row, ["U区", "U"]) || "0")),
            zoneV: parseFloat(String(findCellValue(row, ["V区", "V"]) || "0")),
            zoneX: parseFloat(String(findCellValue(row, ["X区", "X"]) || "0")),
            zoneY: parseFloat(String(findCellValue(row, ["Y区", "Y"]) || "0")),
            zoneZ: parseFloat(String(findCellValue(row, ["Z区", "Z"]) || "0")),
          });
        }

        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

export function generateFedExPriceTemplate(): Blob {
  const headers = ["渠道代码", "重量(KG)", "2区", "A区", "B区", "D区", "E区", "F区", "G区", "H区", "K区", "M区", "N区", "O区", "P区", "Q区", "R区", "S区", "T区", "U区", "V区", "X区", "Y区", "Z区"];
  const example = [
    ["FEDEX", 0.5, 169.67, 126.95, 128.04, 164.56, 170.84, 251.72, 311.11, 186.67, 209.26, 212.72, 197.07, 123.64, 117.63, 86.38, 99.15, 108.68, 136.7, 165.3, 63.4, 91.18, 95.36, 96.28],
    ["FEDEX", 1.0, 223.19, 121.84, 114.83, 173.8, 152.68, 265.5, 323.38, 234.16, 222.92, 231.95, 253.91, 111.86, 111.05, 97.35, 117.54, 120.8, 143.41, 156.86, 63.93, 127.41, 85.74, 106.79],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "FedEx价格表");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadFedExPriceTemplate() {
  const blob = generateFedExPriceTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "FedEx价格表导入模板.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ UPS 快递价格表导入（无分区） ============

export interface UPSPriceRow {
  carrierCode: string;
  weight: number;
  price: number;
}

export function parseUPSPriceExcel(file: File): Promise<UPSPriceRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) { reject(new Error("无法读取文件")); return; }

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

        if (jsonData.length === 0) {
          reject(new Error("Excel 文件中没有数据"));
          return;
        }

        const parsed: UPSPriceRow[] = [];
        for (const row of jsonData) {
          const carrierCode = findCellValue(row, ["渠道代码", "渠道", "code"]);
          const weight = findCellValue(row, ["重量", "重量kg", "weight", "kg"]);
          const price = findCellValue(row, ["单价", "价格", "price", "总价", "金额"]);
          if (!carrierCode) continue;

          parsed.push({
            carrierCode: String(carrierCode).trim().toUpperCase(),
            weight: parseFloat(String(weight || "0")),
            price: parseFloat(String(price || "0")),
          });
        }

        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

export function generateUPSPriceTemplate(): Blob {
  const headers = ["渠道代码", "重量(KG)", "单价(RMB)"];
  const example = [
    ["UPS", 0.5, 137.81],
    ["UPS", 1.0, 143.12],
    ["UPS", 1.5, 231.76],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "UPS价格表");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadUPSPriceTemplate() {
  const blob = generateUPSPriceTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "UPS价格表导入模板.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
