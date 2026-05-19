import { useState, useCallback } from "react";
import { Search, MapPin, Package, Ruler, ChevronDown, Check, Loader2, Crown } from "lucide-react";
import { countries } from "@/data/countries";
import { useCarrierStore } from "@/stores/carrierStore";
import { useRateStore } from "@/stores/rateStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useExpressPriceStore } from "@/stores/expressPriceStore";
import { useSurchargeStore } from "@/stores/surchargeStore";
import { queryRates, getBestRecommendation, getCountryByCode } from "@/utils/calculator";
import { formatPrice, formatWeight } from "@/utils/formatter";
import type { QueryResult } from "@/types";

export default function QueryPage() {
  const [countryCode, setCountryCode] = useState("US");
  const [weight, setWeight] = useState<number | "">("");
  const [length, setLength] = useState<number | "">("");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([
    "yuntu-standard",
    "yuntu-economy",
    "yuntu-wig",
    "dhl",
    "ups",
    "fedex",
  ]);
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const { carriers } = useCarrierStore();
  const rates = useRateStore((s) => s.rates);
  const addHistory = useHistoryStore((s) => s.addHistory);
  const expressPriceStore = useExpressPriceStore();
  const { getFuelSurcharge, getAdditionalSurchargeTotal } = useSurchargeStore();

  const filteredCountries = countries.filter(
    (c) =>
      c.nameCN.includes(countrySearch) ||
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedCountry = getCountryByCode(countryCode);

  const toggleCarrier = useCallback((carrierId: string) => {
    setSelectedCarriers((prev) =>
      prev.includes(carrierId)
        ? prev.filter((c) => c !== carrierId)
        : [...prev, carrierId]
    );
  }, []);

  const handleQuery = useCallback(() => {
    if (selectedCarriers.length === 0) return;
    if (weight === "" || weight <= 0) return;
    setIsLoading(true);
    setHasQueried(false);

    const fuelRates: Record<string, number> = {};
    const additionalMap: Record<string, number> = {};
    selectedCarriers.forEach((cid) => {
      const lowerCid = cid.toLowerCase();
      fuelRates[lowerCid] = getFuelSurcharge(cid);
      additionalMap[`${lowerCid}_${countryCode}`] = getAdditionalSurchargeTotal(cid, countryCode);
    });

    setTimeout(() => {
      const queryResults = queryRates(
        {
          countryCode,
          weight: Number(weight),
          length: Number(length || 0),
          width: Number(width || 0),
          height: Number(height || 0),
          selectedCarriers,
        },
        rates,
        carriers,
        expressPriceStore,
        fuelRates,
        additionalMap
      );
      setResults(queryResults);
      setHasQueried(true);
      setIsLoading(false);

      if (queryResults.length > 0 && selectedCountry) {
        addHistory(
          countryCode,
          selectedCountry.nameCN,
          Number(weight),
          { l: Number(length || 0), w: Number(width || 0), h: Number(height || 0) },
          queryResults
        );
      }
    }, 600);
  }, [countryCode, weight, length, width, height, selectedCarriers, rates, addHistory, selectedCountry, expressPriceStore, getFuelSurcharge, getAdditionalSurchargeTotal]);

  const bestResult = getBestRecommendation(results);

  const getCarrierBillingMode = (id: string) => carriers.find((c) => c.id === id)?.billingMode;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8E3] p-6 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-[#3E2349] mb-6 flex items-center gap-2">
          <Search className="w-6 h-6 text-[#C4A35A]" />
          运费查询
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-[#6B5B73] mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1" />
              目的地国家
            </label>
            <button
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-[#E0D8E3] rounded-lg bg-white text-left hover:border-[#C4A35A] transition-colors"
            >
              <span>
                {selectedCountry
                  ? `${selectedCountry.nameCN} (${selectedCountry.code})`
                  : "选择国家"}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showCountryDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-[#E0D8E3] rounded-lg shadow-xl max-h-64 overflow-auto">
                <input
                  type="text"
                  placeholder="搜索国家..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="w-full px-4 py-2 border-b border-[#E0D8E3] sticky top-0 bg-white"
                  autoFocus
                />
                {filteredCountries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountryCode(c.code);
                      setShowCountryDropdown(false);
                      setCountrySearch("");
                    }}
                    className={`w-full px-4 py-2 text-left hover:bg-[#F7F4F0] flex items-center justify-between ${
                      c.code === countryCode ? "bg-[#F7F4F0] text-[#C4A35A]" : ""
                    }`}
                  >
                    <span>
                      {c.nameCN} ({c.code})
                    </span>
                    {c.code === countryCode && (
                      <Check className="w-4 h-4 text-[#C4A35A]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5B73] mb-1.5">
              <Package className="w-4 h-4 inline mr-1" />
              实际重量 (kg)
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              placeholder="请输入重量"
              value={weight}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setWeight("");
                  return;
                }
                const val = parseFloat(raw);
                setWeight(isNaN(val) || val < 0 ? "" : val);
              }}
              className="w-full px-4 py-2.5 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-[#6B5B73] mb-1.5">
                <Ruler className="w-4 h-4 inline mr-1" />
                长 (cm)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={length}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setLength("");
                    return;
                  }
                  const val = parseFloat(raw);
                  setLength(isNaN(val) || val < 0 ? "" : val);
                }}
                className="w-full px-3 py-2.5 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B5B73] mb-1.5">宽 (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={width}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setWidth("");
                    return;
                  }
                  const val = parseFloat(raw);
                  setWidth(isNaN(val) || val < 0 ? "" : val);
                }}
                className="w-full px-3 py-2.5 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6B5B73] mb-1.5">高 (cm)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={height}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setHeight("");
                    return;
                  }
                  const val = parseFloat(raw);
                  setHeight(isNaN(val) || val < 0 ? "" : val);
                }}
                className="w-full px-3 py-2.5 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-[#6B5B73] mb-2">选择物流渠道</label>
          <div className="flex flex-wrap gap-2">
            {carriers.map((carrier) => (
              <button
                key={carrier.id}
                onClick={() => toggleCarrier(carrier.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  selectedCarriers.includes(carrier.id)
                    ? "border-[#C4A35A] bg-[#F7F4F0] text-[#3E2349]"
                    : "border-[#E0D8E3] bg-white text-[#6B5B73] hover:border-[#C4A35A]"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: carrier.color }}
                />
                <span className="text-sm font-medium">{carrier.name}</span>
                {selectedCarriers.includes(carrier.id) && (
                  <Check className="w-3.5 h-3.5" />
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleQuery}
          disabled={isLoading || selectedCarriers.length === 0}
          className="mt-6 w-full md:w-auto px-8 py-3 btn-primary rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              查询中...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              查询运费
            </>
          )}
        </button>
      </div>

      {hasQueried && results.length > 0 && (
        <div className="space-y-4">
          {bestResult && (
            <div className="bg-gradient-to-r from-[#3E2349] to-[#5A3D66] rounded-2xl p-6 text-white shadow-lg animate-fade-in-up">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-[#C4A35A]" />
                <span className="font-bold text-lg">最优推荐</span>
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
                  价格最低
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {bestResult.carrierName}
              </div>
              <div className="text-[#D9C9A0] text-sm mb-4">
                {bestResult.serviceType}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold font-mono">
                    {formatPrice(bestResult.totalPrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[#D9C9A0]">预计时效</div>
                  <div className="font-semibold">{bestResult.estimatedDays}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex flex-wrap gap-4 text-sm text-[#D9C9A0]">
                <span>计费重量: {formatWeight(bestResult.chargeableWeight)}</span>
                {bestResult.registrationFee > 0 && (
                  <span>挂号费: {formatPrice(bestResult.registrationFee)}</span>
                )}
                {bestResult.additionalFee > 0 && (
                  <span>附加费: {formatPrice(bestResult.additionalFee)}</span>
                )}
                {bestResult.fuelSurcharge > 0 && (
                  <span>燃油附加: {formatPrice(bestResult.fuelSurcharge)}</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result, index) => {
              const isYuntu = getCarrierBillingMode(result.carrierId) === "yuntu";
              return (
                <div
                  key={result.carrierId}
                  className="bg-white rounded-xl border border-[#E0D8E3] p-5 card-hover animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: result.carrierColor }}
                      />
                      <span className="font-bold text-[#3E2349]">{result.carrierName}</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-[#F7F4F0] rounded-full text-[#6B5B73]">
                      {result.serviceType}
                    </span>
                  </div>

                  <div className="text-2xl font-bold font-mono text-[#3E2349] mb-2">
                    {formatPrice(result.totalPrice)}
                  </div>

                  <div className="space-y-1.5 text-sm text-[#6B5B73]">
                    <div className="flex justify-between">
                      <span>预计时效</span>
                      <span className="font-medium text-[#3E2349]">{result.estimatedDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>计费重量</span>
                      <span className="font-medium text-[#3E2349]">
                        {formatWeight(result.chargeableWeight)}
                      </span>
                    </div>
                    {isYuntu ? (
                      <>
                        <div className="flex justify-between">
                          <span>运费</span>
                          <span className="font-medium text-[#3E2349]">
                            {formatPrice(result.basePrice)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>挂号费</span>
                          <span className="font-medium text-[#3E2349]">
                            {formatPrice(result.registrationFee)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>分区</span>
                          <span className="font-medium text-[#3E2349]">
                            {result.zone ? `${result.zone}区` : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>固定单价</span>
                          <span className="font-medium text-[#3E2349]">
                            {formatPrice(result.basePrice)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>附加费</span>
                          <span className="font-medium text-[#3E2349]">
                            {formatPrice(result.additionalFee)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>燃油附加费</span>
                          <span className="font-medium text-[#3E2349]">
                            {formatPrice(result.fuelSurcharge)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {result.volumetricWeight > result.actualWeight && (
                    <div className="mt-3 px-3 py-2 bg-[#F7F4F0] border border-[#E0D8E3] rounded-lg text-xs text-[#C4A35A]">
                      按体积重计费 ({formatWeight(result.volumetricWeight)})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hasQueried && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-[#E0D8E3] p-8 text-center animate-fade-in-up">
          <Package className="w-12 h-12 text-[#A89DB0] mx-auto mb-3" />
          <p className="text-[#6B5B73]">未找到该国家/重量段的运费模板，请前往运费模板页面添加</p>
        </div>
      )}
    </div>
  );
}
