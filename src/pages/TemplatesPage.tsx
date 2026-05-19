import { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Search,
  Edit2,
  Trash2,
  Plus,
  Save,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Upload,
  Download,
} from "lucide-react";
import { countries } from "@/data/countries";
import { useCarrierStore } from "@/stores/carrierStore";
import { useRateStore } from "@/stores/rateStore";
import { useExpressPriceStore } from "@/stores/expressPriceStore";
import { formatPrice } from "@/utils/formatter";
import {
  parseExcelFile,
  downloadExcelTemplate,
  groupByCarrierAndCountry,
  convertToYuntuTiers,
  parseDhlPriceExcel,
  downloadDhlPriceTemplate,
  parseFedExPriceExcel,
  downloadFedExPriceTemplate,
  parseUPSPriceExcel,
  downloadUPSPriceTemplate,
} from "@/utils/excelImport";
import { dhlZoneMap } from "@/data/expressZones";
import { fedExZoneMap } from "@/data/expressZonesFedEx";
import type { CarrierCountryRate, YuntuWeightTier } from "@/types";

export default function TemplatesPage() {
  const { carriers } = useCarrierStore();
  const {
    rates,
    selectedCarrier,
    selectedCountry,
    setSelectedCarrier,
    setSelectedCountry,
    updateYuntuTiers,
    updateEstimatedDays,
    deleteRate,
    resetToDefault,
    getFilteredRates,
    batchUpdateYuntuRates,
    addRate,
  } = useRateStore();
  const { setTable: setPriceTable, resetToDefault: resetPriceTable } = useExpressPriceStore();

  const [editingRate, setEditingRate] = useState<CarrierCountryRate | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedRates, setExpandedRates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dhlImportLoading, setDhlImportLoading] = useState(false);
  const [dhlImportResult, setDhlImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const dhlFileInputRef = useRef<HTMLInputElement>(null);

  const [fedExImportLoading, setFedExImportLoading] = useState(false);
  const [fedExImportResult, setFedExImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const fedExFileInputRef = useRef<HTMLInputElement>(null);

  const [upsImportLoading, setUpsImportLoading] = useState(false);
  const [upsImportResult, setUpsImportResult] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
  const upsFileInputRef = useRef<HTMLInputElement>(null);

  const [newRate, setNewRate] = useState<{
    carrierId: string;
    countryCode: string;
    estimatedDays: { min: number; max: number };
    yuntuTiers: YuntuWeightTier[];
  }>({
    carrierId: carriers[0]?.id || "",
    countryCode: "US",
    estimatedDays: { min: 5, max: 10 },
    yuntuTiers: [
      { weightFrom: 0, weightTo: 0.1, unitPrice: 75, registrationFee: 20 },
      { weightFrom: 0.1, weightTo: 0.5, unitPrice: 70, registrationFee: 20 },
      { weightFrom: 0.5, weightTo: 1, unitPrice: 65, registrationFee: 18 },
      { weightFrom: 1, weightTo: 2, unitPrice: 62, registrationFee: 18 },
      { weightFrom: 2, weightTo: 5, unitPrice: 58, registrationFee: 18 },
      { weightFrom: 5, weightTo: 10, unitPrice: 55, registrationFee: 18 },
      { weightFrom: 10, weightTo: 20, unitPrice: 52, registrationFee: 18 },
      { weightFrom: 20, weightTo: 30, unitPrice: 48, registrationFee: 18 },
    ],
  });

  // 从 store 获取 carrier 信息的工具函数
  const getCarrierById = (id: string) => carriers.find((c) => c.id === id);

  const filteredRates = getFilteredRates().filter((r) => {
    if (!searchQuery) return true;
    const carrier = getCarrierById(r.carrierId);
    const country = countries.find((c) => c.code === r.countryCode);
    const q = searchQuery.toLowerCase();
    return (
      carrier?.name.toLowerCase().includes(q) ||
      carrier?.code.toLowerCase().includes(q) ||
      country?.nameCN.includes(q) ||
      r.countryCode.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (key: string) => {
    setExpandedRates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getCarrierName = (id: string) => getCarrierById(id)?.name || id;
  const getCarrierCode = (id: string) => getCarrierById(id)?.code || id;
  const getCountryName = (code: string) =>
    countries.find((c) => c.code === code)?.nameCN || code;
  const getCarrierBillingMode = (id: string) =>
    getCarrierById(id)?.billingMode;

  const handleSaveYuntu = (rate: CarrierCountryRate) => {
    if (rate.yuntuTiers) {
      updateYuntuTiers(rate.carrierId, rate.countryCode, rate.yuntuTiers, rate.estimatedDays);
    }
    setEditingRate(null);
  };

  const handleSaveExpress = (rate: CarrierCountryRate) => {
    updateEstimatedDays(rate.carrierId, rate.countryCode, rate.estimatedDays);
    setEditingRate(null);
  };

  const handleAdd = () => {
    const carrier = getCarrierById(newRate.carrierId);
    if (!carrier) return;

    if (carrier.billingMode === "yuntu") {
      updateYuntuTiers(newRate.carrierId, newRate.countryCode, newRate.yuntuTiers, newRate.estimatedDays);
    } else {
      updateEstimatedDays(newRate.carrierId, newRate.countryCode, newRate.estimatedDays);
    }
    setShowAddForm(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportResult(null);

    try {
      const parsedData = await parseExcelFile(file);
      const grouped = groupByCarrierAndCountry(parsedData);

      const errors: string[] = [];
      const updates: {
        carrierId: string;
        countryCode: string;
        tiers: { weightFrom: number; weightTo: number; unitPrice: number; registrationFee: number }[];
        estimatedDays: { min: number; max: number };
      }[] = [];

      const availableCarrierCodes = carriers.map((c) => `${c.code}(${c.name})`).join(", ");

      for (const [key, items] of grouped) {
        const firstItem = items[0];
        const carrierCode = firstItem.carrierCode;

        if (!carrierCode) {
          errors.push(`渠道代码为空，请检查 Excel 数据`);
          continue;
        }

        // 从 carrierStore 中查找匹配的渠道代码
        const carrier = carriers.find((c) => c.code === carrierCode);

        if (!carrier) {
          errors.push(
            `未找到渠道代码: "${carrierCode}"（国家: ${firstItem.countryName}/${firstItem.countryCode}）。系统中可用的渠道代码: ${availableCarrierCodes}`
          );
          continue;
        }

        if (carrier.billingMode !== "yuntu") {
          errors.push(`${carrier.name}(${carrier.code}) 是快递模式，暂不支持 Excel 批量导入`);
          continue;
        }

        const { tiers, estimatedDays } = convertToYuntuTiers(items);
        updates.push({
          carrierId: carrier.id,
          countryCode: firstItem.countryCode,
          tiers,
          estimatedDays,
        });
      }

      if (updates.length > 0) {
        batchUpdateYuntuRates(updates);
      }

      setImportResult({
        success: updates.length,
        errors,
      });
    } catch (error) {
      setImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : "导入失败"],
      });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDhlPriceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDhlImportLoading(true);
    setDhlImportResult(null);

    try {
      const rows = await parseDhlPriceExcel(file);
      const errors: string[] = [];
      const byCarrier = new Map<string, { weight: number; zonePrices: Record<string, number> }[]>();

      for (const row of rows) {
        const carrier = carriers.find((c) => c.code === row.carrierCode);
        if (!carrier) {
          errors.push(`未找到渠道代码: ${row.carrierCode}`);
          continue;
        }
        if (carrier.billingMode !== "express") {
          errors.push(`${carrier.name} 不是快递模式`);
          continue;
        }
        if (!byCarrier.has(carrier.id)) byCarrier.set(carrier.id, []);
        byCarrier.get(carrier.id)!.push({
          weight: row.weight,
          zonePrices: {
            "1": row.zone1, "2": row.zone2, "3": row.zone3,
            "4": row.zone4, "5": row.zone5, "6": row.zone6,
            "7": row.zone7, "8": row.zone8, "9": row.zone9,
          },
        });
      }

      let successCount = 0;
      for (const [carrierId, tiers] of byCarrier) {
        tiers.sort((a, b) => a.weight - b.weight);
        setPriceTable(carrierId, tiers);
        successCount++;

        // 自动生成该渠道所有国家的运费模板记录
        const carrier = carriers.find((c) => c.id.toLowerCase() === carrierId.toLowerCase());
        if (carrier) {
          const zoneCountries = Object.keys(dhlZoneMap);
          let addedCount = 0;
          for (const countryCode of zoneCountries) {
            const existing = rates.find(
              (r) => r.carrierId.toLowerCase() === carrierId.toLowerCase() && r.countryCode === countryCode
            );
            if (!existing) {
              addRate({
                carrierId: carrierId.toLowerCase(),
                countryCode,
                estimatedDays: { min: 2, max: 5 },
              });
              addedCount++;
            }
          }
          if (addedCount > 0) {
            errors.push(`${carrier.name}: 已自动生成 ${addedCount} 个国家的运费模板`);
          }
        }
      }

      setDhlImportResult({ success: successCount, errors });
    } catch (error) {
      setDhlImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : "导入失败"],
      });
    } finally {
      setDhlImportLoading(false);
      if (dhlFileInputRef.current) dhlFileInputRef.current.value = "";
    }
  };

  const handleFedExPriceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFedExImportLoading(true);
    setFedExImportResult(null);

    try {
      const rows = await parseFedExPriceExcel(file);
      const errors: string[] = [];
      const byCarrier = new Map<string, { weight: number; zonePrices: Record<string, number> }[]>();

      for (const row of rows) {
        const carrier = carriers.find((c) => c.code === row.carrierCode);
        if (!carrier) {
          errors.push(`未找到渠道代码: ${row.carrierCode}`);
          continue;
        }
        if (carrier.billingMode !== "express") {
          errors.push(`${carrier.name} 不是快递模式`);
          continue;
        }
        if (!byCarrier.has(carrier.id)) byCarrier.set(carrier.id, []);
        byCarrier.get(carrier.id)!.push({
          weight: row.weight,
          zonePrices: {
            "2": row.zone2, A: row.zoneA, B: row.zoneB, D: row.zoneD, E: row.zoneE,
            F: row.zoneF, G: row.zoneG, H: row.zoneH, K: row.zoneK, M: row.zoneM,
            N: row.zoneN, O: row.zoneO, P: row.zoneP, Q: row.zoneQ, R: row.zoneR,
            S: row.zoneS, T: row.zoneT, U: row.zoneU, V: row.zoneV, X: row.zoneX,
            Y: row.zoneY, Z: row.zoneZ,
          },
        });
      }

      let successCount = 0;
      for (const [carrierId, tiers] of byCarrier) {
        tiers.sort((a, b) => a.weight - b.weight);
        setPriceTable(carrierId, tiers);
        successCount++;

        // 自动生成该渠道所有国家的运费模板记录
        const carrier = carriers.find((c) => c.id.toLowerCase() === carrierId.toLowerCase());
        if (carrier) {
          const zoneCountries = Object.keys(fedExZoneMap);
          let addedCount = 0;
          for (const countryCode of zoneCountries) {
            const existing = rates.find(
              (r) => r.carrierId.toLowerCase() === carrierId.toLowerCase() && r.countryCode === countryCode
            );
            if (!existing) {
              addRate({
                carrierId: carrierId.toLowerCase(),
                countryCode,
                estimatedDays: { min: 2, max: 5 },
              });
              addedCount++;
            }
          }
          if (addedCount > 0) {
            errors.push(`${carrier.name}: 已自动生成 ${addedCount} 个国家的运费模板`);
          }
        }
      }

      setFedExImportResult({ success: successCount, errors });
    } catch (error) {
      setFedExImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : "导入失败"],
      });
    } finally {
      setFedExImportLoading(false);
      if (fedExFileInputRef.current) fedExFileInputRef.current.value = "";
    }
  };

  const handleUPSPriceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUpsImportLoading(true);
    setUpsImportResult(null);

    try {
      const rows = await parseUPSPriceExcel(file);
      const errors: string[] = [];
      const byCarrier = new Map<string, { weight: number; zonePrices: Record<string, number> }[]>();

      for (const row of rows) {
        const carrier = carriers.find((c) => c.code === row.carrierCode);
        if (!carrier) {
          errors.push(`未找到渠道代码: ${row.carrierCode}`);
          continue;
        }
        if (carrier.billingMode !== "express") {
          errors.push(`${carrier.name} 不是快递模式`);
          continue;
        }
        if (!byCarrier.has(carrier.id)) byCarrier.set(carrier.id, []);
        byCarrier.get(carrier.id)!.push({
          weight: row.weight,
          zonePrices: { "1": row.price },
        });
      }

      let successCount = 0;
      for (const [carrierId, tiers] of byCarrier) {
        tiers.sort((a, b) => a.weight - b.weight);
        setPriceTable(carrierId, tiers);
        successCount++;

        // UPS 只支持美国，只生成美国的运费模板记录
        const carrier = carriers.find((c) => c.id.toLowerCase() === carrierId.toLowerCase());
        if (carrier) {
          const existing = rates.find(
            (r) => r.carrierId.toLowerCase() === carrierId.toLowerCase() && r.countryCode === "US"
          );
          if (!existing) {
            addRate({
              carrierId: carrierId.toLowerCase(),
              countryCode: "US",
              estimatedDays: { min: 2, max: 5 },
            });
            errors.push(`${carrier.name}: 已自动生成美国的运费模板`);
          }
        }
      }

      setUpsImportResult({ success: successCount, errors });
    } catch (error) {
      setUpsImportResult({
        success: 0,
        errors: [error instanceof Error ? error.message : "导入失败"],
      });
    } finally {
      setUpsImportLoading(false);
      if (upsFileInputRef.current) upsFileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8E3] p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#3E2349] flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#C4A35A]" />
            运费模板管理
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新增国家
            </button>
            <button
              onClick={resetToDefault}
              className="flex items-center gap-2 px-4 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              重置运费模板
            </button>
            <button
              onClick={() => {
                if (confirm("确定要重置所有快递价格表为默认值吗？这会清除自定义的 DHL/FedEx/UPS 价格表。")) {
                  resetPriceTable("dhl");
                  resetPriceTable("fedex");
                  resetPriceTable("ups");
                  alert("已重置所有快递价格表为默认值");
                }
              }}
              className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              重置快递价格表
            </button>
          </div>
        </div>

        {/* Excel 批量导入区域 */}
        <div className="bg-[#F7F4F0] rounded-xl border border-[#E0D8E3] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#3E2349] flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#C4A35A]" />
              批量导入
            </h2>
            <button
              onClick={downloadExcelTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-3 h-3" />
              下载导入模板
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0D8E3] rounded-lg cursor-pointer hover:bg-[#F7F4F0] transition-colors text-sm">
              <Upload className="w-4 h-4 text-[#A89DB0]" />
              <span className="text-[#6B5B73]">选择 Excel 文件</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {importLoading && (
              <span className="text-sm text-[#A89DB0]">导入中...</span>
            )}
          </div>

          {importResult && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-[#E0D8E3]">
              <div className="text-sm">
                <span className="text-emerald-600 font-medium">
                  成功导入 {importResult.success} 条记录
                </span>
                {importResult.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="text-red-500 font-medium">
                      错误 ({importResult.errors.length}条):
                    </span>
                    <ul className="mt-1 text-xs text-red-500 space-y-1">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* DHL 快递价格表导入区域 */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#3E2349] flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-500" />
              DHL 价格表导入
            </h2>
            <button
              onClick={downloadDhlPriceTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-white rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Download className="w-3 h-3" />
              下载 DHL 模板
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors text-sm">
              <Upload className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600">选择 DHL 价格表 Excel</span>
              <input
                ref={dhlFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleDhlPriceUpload}
                className="hidden"
              />
            </label>
            {dhlImportLoading && (
              <span className="text-sm text-blue-500">导入中...</span>
            )}
          </div>

          {dhlImportResult && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
              <div className="text-sm">
                <span className="text-emerald-600 font-medium">
                  成功导入 {dhlImportResult.success} 个渠道价格表
                </span>
                {dhlImportResult.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="text-red-500 font-medium">
                      错误 ({dhlImportResult.errors.length}条):
                    </span>
                    <ul className="mt-1 text-xs text-red-500 space-y-1">
                      {dhlImportResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FedEx 快递价格表导入区域 */}
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#3E2349] flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-500" />
              FedEx 价格表导入
            </h2>
            <button
              onClick={downloadFedExPriceTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-600 bg-white rounded-lg hover:bg-purple-100 transition-colors"
            >
              <Download className="w-3 h-3" />
              下载 FedEx 模板
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-300 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors text-sm">
              <Upload className="w-4 h-4 text-purple-500" />
              <span className="text-purple-600">选择 FedEx 价格表 Excel</span>
              <input
                ref={fedExFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFedExPriceUpload}
                className="hidden"
              />
            </label>
            {fedExImportLoading && (
              <span className="text-sm text-purple-500">导入中...</span>
            )}
          </div>

          {fedExImportResult && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
              <div className="text-sm">
                <span className="text-emerald-600 font-medium">
                  成功导入 {fedExImportResult.success} 个渠道价格表
                </span>
                {fedExImportResult.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="text-red-500 font-medium">
                      错误 ({fedExImportResult.errors.length}条):
                    </span>
                    <ul className="mt-1 text-xs text-red-500 space-y-1">
                      {fedExImportResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* UPS 快递价格表导入区域 */}
        <div className="bg-[#F7F4F0] rounded-xl border border-[#D9C9A0] p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#3E2349] flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#C4A35A]" />
              UPS 价格表导入
            </h2>
            <button
              onClick={downloadUPSPriceTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#C4A35A] bg-white rounded-lg hover:bg-[#F7F4F0] transition-colors"
            >
              <Download className="w-3 h-3" />
              下载 UPS 模板
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-[#D9C9A0] rounded-lg cursor-pointer hover:bg-[#F7F4F0] transition-colors text-sm">
              <Upload className="w-4 h-4 text-[#C4A35A]" />
              <span className="text-[#C4A35A]">选择 UPS 价格表 Excel</span>
              <input
                ref={upsFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUPSPriceUpload}
                className="hidden"
              />
            </label>
            {upsImportLoading && (
              <span className="text-sm text-[#C4A35A]">导入中...</span>
            )}
          </div>

          {upsImportResult && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-[#D9C9A0]">
              <div className="text-sm">
                <span className="text-emerald-600 font-medium">
                  成功导入 {upsImportResult.success} 个渠道价格表
                </span>
                {upsImportResult.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="text-red-500 font-medium">
                      错误 ({upsImportResult.errors.length}条):
                    </span>
                    <ul className="mt-1 text-xs text-red-500 space-y-1">
                      {upsImportResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 筛选和搜索 */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89DB0]" />
            <input
              type="text"
              placeholder="搜索渠道或国家..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
            />
          </div>
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            className="px-4 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
          >
            <option value="">所有渠道</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-4 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
          >
            <option value="">所有国家</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameCN}
              </option>
            ))}
          </select>
        </div>

        {/* 新增表单 */}
        {showAddForm && (
          <div className="bg-[#F7F4F0] rounded-xl border border-[#E0D8E3] p-5 mb-4">
            <h3 className="text-lg font-semibold text-[#3E2349] mb-4">新增国家运费</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-[#A89DB0] mb-1">渠道</label>
                <select
                  value={newRate.carrierId}
                  onChange={(e) => {
                    const carrier = getCarrierById(e.target.value);
                    setNewRate({
                      ...newRate,
                      carrierId: e.target.value,
                    });
                  }}
                  className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm"
                >
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#A89DB0] mb-1">国家</label>
                <select
                  value={newRate.countryCode}
                  onChange={(e) =>
                    setNewRate({ ...newRate, countryCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameCN}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#A89DB0] mb-1">时效 (天)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newRate.estimatedDays.min}
                    onChange={(e) =>
                      setNewRate({
                        ...newRate,
                        estimatedDays: {
                          ...newRate.estimatedDays,
                          min: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-20 px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm"
                  />
                  <span className="text-[#A89DB0]">-</span>
                  <input
                    type="number"
                    value={newRate.estimatedDays.max}
                    onChange={(e) =>
                      setNewRate({
                        ...newRate,
                        estimatedDays: {
                          ...newRate.estimatedDays,
                          max: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-20 px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {getCarrierBillingMode(newRate.carrierId) === "yuntu" ? (
              <div className="space-y-2">
                {newRate.yuntuTiers.map((tier, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="起始重量"
                      value={tier.weightFrom}
                      onChange={(e) => {
                        const tiers = [...newRate.yuntuTiers];
                        tiers[idx] = { ...tier, weightFrom: parseFloat(e.target.value) };
                        setNewRate({ ...newRate, yuntuTiers: tiers });
                      }}
                      className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="结束重量"
                      value={tier.weightTo}
                      onChange={(e) => {
                        const tiers = [...newRate.yuntuTiers];
                        tiers[idx] = { ...tier, weightTo: parseFloat(e.target.value) };
                        setNewRate({ ...newRate, yuntuTiers: tiers });
                      }}
                      className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="单价/kg"
                      value={tier.unitPrice}
                      onChange={(e) => {
                        const tiers = [...newRate.yuntuTiers];
                        tiers[idx] = { ...tier, unitPrice: parseFloat(e.target.value) };
                        setNewRate({ ...newRate, yuntuTiers: tiers });
                      }}
                      className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="挂号费"
                      value={tier.registrationFee}
                      onChange={(e) => {
                        const tiers = [...newRate.yuntuTiers];
                        tiers[idx] = { ...tier, registrationFee: parseFloat(e.target.value) };
                        setNewRate({ ...newRate, yuntuTiers: tiers });
                      }}
                      className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                    />
                    <button
                      onClick={() => {
                        const tiers = newRate.yuntuTiers.filter((_, i) => i !== idx);
                        setNewRate({ ...newRate, yuntuTiers: tiers });
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewRate({
                      ...newRate,
                      yuntuTiers: [
                        ...newRate.yuntuTiers,
                        { weightFrom: 0, weightTo: 1, unitPrice: 50, registrationFee: 18 },
                      ],
                    })
                  }
                  className="text-sm text-[#C4A35A] hover:text-[#C9956A] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  添加重量段
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#A89DB0]">
                快递渠道只需配置时效，附加费和燃油费率请在「附加费管理」页面设置。
              </p>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex items-center gap-2 px-4 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredRates.map((rate) => {
            const key = `${rate.carrierId}-${rate.countryCode}`;
            const isExpanded = expandedRates.has(key);
            const isEditing =
              editingRate?.carrierId === rate.carrierId &&
              editingRate?.countryCode === rate.countryCode;
            const isYuntu = getCarrierBillingMode(rate.carrierId) === "yuntu";

            return (
              <div
                key={key}
                className="border border-[#E0D8E3] rounded-xl overflow-hidden"
              >
                <div
                  className="flex items-center justify-between px-5 py-4 bg-[#F7F4F0] cursor-pointer hover:bg-[#F7F4F0] transition-colors"
                  onClick={() => toggleExpand(key)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: getCarrierById(rate.carrierId)?.color,
                      }}
                    />
                    <span className="font-semibold text-[#3E2349]">
                      {getCarrierName(rate.carrierId)}
                    </span>
                    <span className="text-xs text-[#A89DB0] font-mono">
                      {getCarrierCode(rate.carrierId)}
                    </span>
                    <span className="text-[#A89DB0]">|</span>
                    <span className="text-[#6B5B73]">
                      {getCountryName(rate.countryCode)} ({rate.countryCode})
                    </span>
                    <span className="text-[#A89DB0]">|</span>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="w-3.5 h-3.5 text-[#C4A35A]" />
                      <span className="font-medium text-[#C4A35A]">
                        {rate.estimatedDays.min}-{rate.estimatedDays.max} 天
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRate({ ...rate });
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRate(rate.carrierId, rate.countryCode);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#A89DB0]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#A89DB0]" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 py-4 bg-white">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-[#C4A35A]" />
                          <span className="text-sm font-medium text-[#6B5B73]">时效配置:</span>
                          <input
                            type="number"
                            value={editingRate.estimatedDays.min}
                            onChange={(e) =>
                              setEditingRate({
                                ...editingRate,
                                estimatedDays: {
                                  ...editingRate.estimatedDays,
                                  min: parseInt(e.target.value) || 1,
                                },
                              })
                            }
                            className="w-16 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                          />
                          <span className="text-[#A89DB0]">-</span>
                          <input
                            type="number"
                            value={editingRate.estimatedDays.max}
                            onChange={(e) =>
                              setEditingRate({
                                ...editingRate,
                                estimatedDays: {
                                  ...editingRate.estimatedDays,
                                  max: parseInt(e.target.value) || 1,
                                },
                              })
                            }
                            className="w-16 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                          />
                          <span className="text-sm text-[#A89DB0]">天</span>
                        </div>

                        {isYuntu && editingRate?.yuntuTiers ? (
                          <>
                            <div className="text-sm font-medium text-[#6B5B73] mb-2">
                              重量段设置
                            </div>
                            {editingRate.yuntuTiers.map((tier, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  step="0.1"
                                  value={tier.weightFrom}
                                  onChange={(e) => {
                                    if (!editingRate.yuntuTiers) return;
                                    const tiers = [...editingRate.yuntuTiers];
                                    tiers[idx] = {
                                      ...tier,
                                      weightFrom: parseFloat(e.target.value),
                                    };
                                    setEditingRate({ ...editingRate, yuntuTiers: tiers });
                                  }}
                                  className="w-20 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                                />
                                <span>-</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={tier.weightTo}
                                  onChange={(e) => {
                                    if (!editingRate.yuntuTiers) return;
                                    const tiers = [...editingRate.yuntuTiers];
                                    tiers[idx] = {
                                      ...tier,
                                      weightTo: parseFloat(e.target.value),
                                    };
                                    setEditingRate({ ...editingRate, yuntuTiers: tiers });
                                  }}
                                  className="w-20 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                                />
                                <input
                                  type="number"
                                  value={tier.unitPrice}
                                  onChange={(e) => {
                                    if (!editingRate.yuntuTiers) return;
                                    const tiers = [...editingRate.yuntuTiers];
                                    tiers[idx] = {
                                      ...tier,
                                      unitPrice: parseFloat(e.target.value),
                                    };
                                    setEditingRate({ ...editingRate, yuntuTiers: tiers });
                                  }}
                                  className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                                />
                                <input
                                  type="number"
                                  value={tier.registrationFee}
                                  onChange={(e) => {
                                    if (!editingRate.yuntuTiers) return;
                                    const tiers = [...editingRate.yuntuTiers];
                                    tiers[idx] = {
                                      ...tier,
                                      registrationFee: parseFloat(e.target.value),
                                    };
                                    setEditingRate({ ...editingRate, yuntuTiers: tiers });
                                  }}
                                  className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                                />
                                <button
                                  onClick={() => {
                                    if (!editingRate.yuntuTiers) return;
                                    const tiers = editingRate.yuntuTiers.filter((_, i) => i !== idx);
                                    setEditingRate({ ...editingRate, yuntuTiers: tiers });
                                  }}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                if (!editingRate?.yuntuTiers) return;
                                setEditingRate({
                                  ...editingRate,
                                  yuntuTiers: [
                                    ...editingRate.yuntuTiers,
                                    { weightFrom: 0, weightTo: 1, unitPrice: 50, registrationFee: 18 },
                                  ],
                                });
                              }}
                              className="text-sm text-[#C4A35A] hover:text-[#C9956A] flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              添加重量段
                            </button>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleSaveYuntu(editingRate)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-sm"
                              >
                                <Save className="w-4 h-4" />
                                保存
                              </button>
                              <button
                                onClick={() => setEditingRate(null)}
                                className="flex items-center gap-2 px-4 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] text-sm"
                              >
                                <X className="w-4 h-4" />
                                取消
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-[#A89DB0]">
                              快递渠道只需配置时效，附加费和燃油费率请在「附加费管理」页面设置。
                            </p>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleSaveExpress(editingRate)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-sm"
                              >
                                <Save className="w-4 h-4" />
                                保存
                              </button>
                              <button
                                onClick={() => setEditingRate(null)}
                                className="flex items-center gap-2 px-4 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] text-sm"
                              >
                                <X className="w-4 h-4" />
                                取消
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#F7F4F0]">
                          <Clock className="w-4 h-4 text-[#C4A35A]" />
                          <span className="text-sm text-[#6B5B73]">时效:</span>
                          <span className="text-sm font-medium text-[#C4A35A]">
                            {rate.estimatedDays.min}-{rate.estimatedDays.max} 天
                          </span>
                        </div>

                        {isYuntu && rate.yuntuTiers ? (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[#F7F4F0]">
                                <th className="text-left py-2 px-3 font-medium text-[#A89DB0]">
                                  重量段 (kg)
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-[#A89DB0]">
                                  单价/kg
                                </th>
                                <th className="text-left py-2 px-3 font-medium text-[#A89DB0]">
                                  挂号费
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {rate.yuntuTiers.map((tier, idx) => (
                                <tr key={idx} className="border-b border-[#F7F4F0]">
                                  <td className="py-2 px-3">
                                    {tier.weightFrom} - {tier.weightTo}
                                  </td>
                                  <td className="py-2 px-3 font-mono">
                                    {formatPrice(tier.unitPrice)}
                                  </td>
                                  <td className="py-2 px-3 font-mono">
                                    {formatPrice(tier.registrationFee)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-sm text-[#A89DB0]">
                            快递渠道：基础价格根据重量和分区自动从价格表查询，附加费和燃油费率请在「附加费管理」页面设置。
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredRates.length === 0 && (
          <div className="text-center py-8 text-[#A89DB0]">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-[#A89DB0]" />
            <p>没有找到匹配的运费模板</p>
          </div>
        )}
      </div>
    </div>
  );
}
