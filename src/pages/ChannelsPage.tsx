import { useState, useRef } from "react";
import {
  Truck,
  Globe,
  Clock,
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  MapPin,
  Upload,
  ImageIcon,
  Table,
  RotateCcw,
} from "lucide-react";
import { useCarrierStore } from "@/stores/carrierStore";
import { useRateStore } from "@/stores/rateStore";
import { useExpressPriceStore } from "@/stores/expressPriceStore";
import { countries } from "@/data/countries";
import type { Carrier, CarrierCountryRate } from "@/types";
import type { ExpressPriceTier } from "@/data/expressPriceTypes";
import { dhlPriceTable, getCarrierZones, fedExZones } from "@/data/expressPrices";
import { fedExPriceTable } from "@/data/expressPricesFedEx";
import { upsPriceTable } from "@/data/expressPricesUPS";

export default function ChannelsPage() {
  const { carriers, addCarrier, updateCarrier, deleteCarrier } = useCarrierStore();
  const { rates, addRate, deleteRate } = useRateStore();
  const { tables: priceTables, setTable: setPriceTable, resetToDefault: resetPriceTable } = useExpressPriceStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploadedLogo, setUploadedLogo] = useState<string>("");
  const [editingPriceTable, setEditingPriceTable] = useState<ExpressPriceTier[]>([]);
  const editLogoInputRef = useRef<HTMLInputElement>(null);
  const addLogoInputRef = useRef<HTMLInputElement>(null);

  const [newCarrier, setNewCarrier] = useState<Partial<Carrier>>({
    name: "",
    code: "",
    logo: "",
    description: "",
    volumetricFactor: 5000,
    services: ["标准服务"],
    color: "#E63946",
    billingMode: "yuntu",
  });

  const getCarrierRates = (carrierId: string): CarrierCountryRate[] => {
    const lowerId = carrierId.toLowerCase();
    return rates.filter((r) => r.carrierId.toLowerCase() === lowerId);
  };

  const getCountryName = (code: string) => {
    return countries.find((c) => c.code === code)?.nameCN || code;
  };

  function handleImageUpload(file: File, setLogo: (dataUrl: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  const handleAdd = () => {
    if (!newCarrier.name || !newCarrier.code) return;

    const carrier: Carrier = {
      id: ``,
      name: newCarrier.name,
      code: newCarrier.code,
      logo: newCarrier.logo || "",
      description: newCarrier.description || "",
      volumetricFactor: newCarrier.volumetricFactor || 5000,
      services: newCarrier.services || ["标准服务"],
      color: newCarrier.color || "#E63946",
      billingMode: newCarrier.billingMode || "yuntu",
    };

    addCarrier(carrier);

    if (carrier.billingMode === "yuntu") {
      addRate({
        carrierId: carrier.id,
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
    } else {
      addRate({
        carrierId: carrier.id,
        countryCode: "US",
        estimatedDays: { min: 2, max: 5 },
      });
    }

    setShowAddForm(false);
    setUploadedLogo("");
    setNewCarrier({
      name: "",
      code: "",
      logo: "",
      description: "",
      volumetricFactor: 5000,
      services: ["标准服务"],
      color: "#E63946",
      billingMode: "yuntu",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("确定要删除该渠道吗？相关的运费模板也会被删除。")) {
      const carrierRates = getCarrierRates(id);
      carrierRates.forEach((rate) => {
        deleteRate(rate.carrierId, rate.countryCode);
      });
      deleteCarrier(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8E3] p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#3E2349] flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#C4A35A]" />
            物流渠道管理
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新增渠道
          </button>
        </div>

        {showAddForm && (
          <div className="mb-6 p-4 bg-[#F7F4F0] rounded-xl border border-[#E0D8E3]">
            <h3 className="font-semibold text-[#3E2349] mb-3">新增物流渠道</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="渠道名称（如云途标快）"
                value={newCarrier.name}
                onChange={(e) => setNewCarrier({ ...newCarrier, name: e.target.value })}
                className="px-3 py-2 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
              <input
                type="text"
                placeholder="渠道代码（如YT-BK）"
                value={newCarrier.code}
                onChange={(e) => setNewCarrier({ ...newCarrier, code: e.target.value })}
                className="px-3 py-2 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
              <div>
                <label className="block text-xs text-[#A89DB0] mb-1">Logo（上传图片或输入URL）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="图片URL"
                    value={newCarrier.logo}
                    onChange={(e) => {
                      setNewCarrier({ ...newCarrier, logo: e.target.value });
                      setUploadedLogo("");
                    }}
                    className="flex-1 px-3 py-2 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                  />
                  <input
                    ref={addLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, (dataUrl) => {
                        setNewCarrier({ ...newCarrier, logo: dataUrl });
                        setUploadedLogo(dataUrl);
                      });
                    }}
                  />
                  <button
                    onClick={() => addLogoInputRef.current?.click()}
                    className="flex items-center gap-1 px-3 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] transition-colors text-sm whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4" />
                    上传
                  </button>
                </div>
              </div>
              <input
                type="text"
                placeholder="描述"
                value={newCarrier.description}
                onChange={(e) => setNewCarrier({ ...newCarrier, description: e.target.value })}
                className="px-3 py-2 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
              <input
                type="number"
                placeholder="体积系数（如5000）"
                value={newCarrier.volumetricFactor}
                onChange={(e) => setNewCarrier({ ...newCarrier, volumetricFactor: parseInt(e.target.value) || 5000 })}
                className="px-3 py-2 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              />
              <select
                value={newCarrier.billingMode}
                onChange={(e) => setNewCarrier({ ...newCarrier, billingMode: e.target.value as "yuntu" | "express" })}
                className="px-3 py-2 border border-[#E0D8E3] rounded-lg focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
              >
                <option value="yuntu">云途模式（重量×单价+挂号费）</option>
                <option value="express">快递模式（0.5kg进位固定价）</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setUploadedLogo("");
                }}
                className="flex items-center gap-2 px-4 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] text-sm transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {carriers.map((carrier, index) => {
            const carrierRates = getCarrierRates(carrier.id);
            const isExpanded = expandedId === carrier.id;

            return (
              <div
                key={carrier.id}
                className="bg-white rounded-xl border border-[#E0D8E3] overflow-hidden card-hover animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {carrier.logo && carrier.logo.startsWith("data:") ? (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white shrink-0 border border-[#E0D8E3] overflow-hidden">
                        <img
                          src={carrier.logo}
                          alt={carrier.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = "none";
                          }}
                        />
                      </div>
                    ) : carrier.logo && carrier.logo.startsWith("http") ? (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white shrink-0 border border-[#E0D8E3] overflow-hidden">
                        <img
                          src={carrier.logo}
                          alt={carrier.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#F7F4F0] text-[#A89DB0] shrink-0 border border-[#E0D8E3]">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-[#3E2349]">{carrier.name}</h3>
                          <span className="text-xs text-[#A89DB0] font-mono">{carrier.code}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            carrier.billingMode === "yuntu"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-blue-100 text-blue-700"
                          }`}>
                            {carrier.billingMode === "yuntu" ? "云途模式" : "快递模式"}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleExpand(carrier.id)}
                            className="p-1.5 text-[#A89DB0] hover:bg-[#F7F4F0] rounded-lg transition-colors"
                            title="查看国家时效"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingId(editingId === carrier.id ? null : carrier.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(carrier.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[#5C5C5C] text-sm mt-1 leading-relaxed">
                        {carrier.description}
                      </p>
                    </div>
                  </div>

                  {editingId === carrier.id && (
                    <div className="mt-4 p-4 bg-[#F7F4F0] rounded-xl border border-[#E0D8E3]">
                      <h4 className="font-medium text-[#3E2349] mb-3 text-sm">编辑渠道信息</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#A89DB0] mb-1">渠道名称</label>
                          <input
                            type="text"
                            value={carrier.name}
                            onChange={(e) => updateCarrier(carrier.id, { name: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#A89DB0] mb-1">渠道代码</label>
                          <input
                            type="text"
                            value={carrier.code}
                            onChange={(e) => updateCarrier(carrier.id, { code: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#A89DB0] mb-1">Logo（上传图片或输入URL）</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="图片URL"
                              value={carrier.logo}
                              onChange={(e) => updateCarrier(carrier.id, { logo: e.target.value })}
                              className="flex-1 px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                            />
                            <input
                              ref={editLogoInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, (dataUrl) => {
                                  updateCarrier(carrier.id, { logo: dataUrl });
                                });
                              }}
                            />
                            <button
                              onClick={() => editLogoInputRef.current?.click()}
                              className="flex items-center gap-1 px-3 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] transition-colors text-sm whitespace-nowrap"
                            >
                              <Upload className="w-4 h-4" />
                              上传
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-[#A89DB0] mb-1">描述</label>
                          <input
                            type="text"
                            value={carrier.description}
                            onChange={(e) => updateCarrier(carrier.id, { description: e.target.value })}
                            className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#A89DB0] mb-1">体积系数</label>
                          <input
                            type="number"
                            value={carrier.volumetricFactor}
                            onChange={(e) => updateCarrier(carrier.id, { volumetricFactor: parseInt(e.target.value) || 5000 })}
                            className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#A89DB0] mb-1">计费模式</label>
                          <select
                            value={carrier.billingMode}
                            onChange={(e) => updateCarrier(carrier.id, { billingMode: e.target.value as "yuntu" | "express" })}
                            className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                          >
                            <option value="yuntu">云途模式</option>
                            <option value="express">快递模式</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-sm transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          完成编辑
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-4 h-4 text-[#A89DB0]" />
                      <span className="text-[#6B5B73]">
                        体积系数: <span className="font-medium text-[#3E2349]">{carrier.volumetricFactor}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-[#A89DB0]" />
                      <span className="text-[#6B5B73]">
                        覆盖国家: <span className="font-medium text-[#3E2349]">{carrierRates.length}</span> 个
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-[#A89DB0]" />
                      <span className="text-[#6B5B73]">
                        时效范围: <span className="font-medium text-[#3E2349]">
                          {carrierRates.length > 0
                            ? `${Math.min(...carrierRates.map((r) => r.estimatedDays.min))}-${Math.max(...carrierRates.map((r) => r.estimatedDays.max))} 天`
                            : "未配置"}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-[#A89DB0]" />
                      <span className="text-[#6B5B73]">
                        计费: <span className="font-medium text-[#3E2349]">
                          {carrier.billingMode === "yuntu" ? "重量×单价" : "固定价+附加费"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#E0D8E3] bg-[#F7F4F0]/50">
                    <div className="p-6 space-y-6">
                      <div>
                        <h4 className="font-semibold text-[#3E2349] mb-4 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-[#C4A35A]" />
                          各国时效与运费配置
                        </h4>
                        {carrierRates.length === 0 ? (
                          <div className="text-center py-8 text-[#A89DB0]">
                            <Globe className="w-12 h-12 mx-auto mb-3 text-[#A89DB0]" />
                            <p>该渠道暂无国家配置</p>
                            <p className="text-sm mt-1">请在运费模板页面添加国家配置</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {carrierRates.map((rate) => (
                              <div
                                key={rate.countryCode}
                                className="bg-white rounded-lg border border-[#E0D8E3] p-4 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{getCountryName(rate.countryCode)}</span>
                                    <span className="text-xs text-[#A89DB0]">({rate.countryCode})</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sm">
                                    <Clock className="w-3.5 h-3.5 text-[#C4A35A]" />
                                    <span className="font-medium text-[#C4A35A]">
                                      {rate.estimatedDays.min}-{rate.estimatedDays.max} 天
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-[#6B5B73] space-y-1">
                                  {rate.yuntuTiers && (
                                    <div>
                                      <span className="text-[#A89DB0]">重量段:</span>{" "}
                                      {rate.yuntuTiers.length} 个 tier
                                    </div>
                                  )}

                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {carrier.billingMode === "express" && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-[#3E2349] flex items-center gap-2">
                              <Table className="w-4 h-4 text-blue-500" />
                              价格表（{carrier.name}）
                            </h4>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const current = priceTables[carrier.id] || [];
                                  const hasCustom = current.length > 0;
                                  if (hasCustom) {
                                    resetPriceTable(carrier.id);
                                  } else {
                                    const cid = carrier.id.toLowerCase();
                                    const defaultTable = cid === "dhl"
                                      ? [...dhlPriceTable]
                                      : cid === "fedex"
                                      ? [...fedExPriceTable]
                                      : cid === "ups"
                                      ? [...upsPriceTable]
                                      : [];
                                    setPriceTable(carrier.id, defaultTable);
                                  }
                                  setEditingPriceTable([]);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#6B5B73] border border-[#E0D8E3] rounded-lg hover:bg-[#F7F4F0] transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {priceTables[carrier.id]?.length > 0 ? "恢复默认" : "启用编辑"}
                              </button>
                              {priceTables[carrier.id]?.length > 0 && (
                                <button
                                  onClick={() => {
                                    const current = priceTables[carrier.id] || [];
                                    setEditingPriceTable(JSON.parse(JSON.stringify(current)));
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  编辑
                                </button>
                              )}
                            </div>
                          </div>

                          {editingPriceTable.length > 0 ? (
                            <div className="bg-white rounded-lg border border-[#E0D8E3]">
                              <div className="max-h-96 overflow-auto">
                                <table className="w-full text-sm">
                                  <thead className="sticky top-0 bg-[#F7F4F0]">
                                    <tr>
                                      <th className="text-left py-2 px-3 font-medium text-[#A89DB0] border-b">重量(KG)</th>
                                      {(() => {
                                        const zones = getCarrierZones(carrier.id);
                                        if (zones.length > 0) {
                                          return zones.map(z => (
                                            <th key={z} className="text-right py-2 px-3 font-medium text-[#A89DB0] border-b">{z}区</th>
                                          ));
                                        }
                                        // fallback: infer from first tier
                                        const firstTier = editingPriceTable[0];
                                        return Object.keys(firstTier?.zonePrices || {}).map(z => (
                                          <th key={z} className="text-right py-2 px-3 font-medium text-[#A89DB0] border-b">{z}区</th>
                                        ));
                                      })()}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {editingPriceTable.slice(0, 20).map((tier, idx) => (
                                      <tr key={idx} className="hover:bg-[#F7F4F0]">
                                        <td className="py-1.5 px-3 border-b">
                                          <input
                                            type="number"
                                            step="0.5"
                                            value={tier.weight}
                                            onChange={(e) => {
                                              const next = [...editingPriceTable];
                                              next[idx] = { ...next[idx], weight: parseFloat(e.target.value) || 0 };
                                              setEditingPriceTable(next);
                                            }}
                                            className="w-16 px-1.5 py-1 border border-[#E0D8E3] rounded text-center text-sm"
                                          />
                                        </td>
                                        {(() => {
                                          const zones = getCarrierZones(carrier.id);
                                          const keys = zones.length > 0 ? zones : Object.keys(tier.zonePrices || {});
                                          return keys.map((zKey) => (
                                            <td key={zKey} className="py-1.5 px-1 border-b">
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={tier.zonePrices[zKey] ?? 0}
                                                onChange={(e) => {
                                                  const next = [...editingPriceTable];
                                                  const zp = { ...next[idx].zonePrices };
                                                  zp[zKey] = parseFloat(e.target.value) || 0;
                                                  next[idx] = { ...next[idx], zonePrices: zp };
                                                  setEditingPriceTable(next);
                                                }}
                                                className="w-full px-1.5 py-1 border border-[#E0D8E3] rounded text-right text-sm"
                                              />
                                            </td>
                                          ));
                                        })()}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {editingPriceTable.length > 20 && (
                                  <p className="text-xs text-[#A89DB0] text-center py-2">
                                    ... 还有 {editingPriceTable.length - 20} 行（可在 Excel 批量导入中编辑完整数据）
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 p-3 border-t">
                                <button
                                  onClick={() => {
                                    setPriceTable(carrier.id, editingPriceTable);
                                    setEditingPriceTable([]);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-xs transition-colors"
                                >
                                  <Save className="w-3 h-3" />
                                  保存价格表
                                </button>
                                <button
                                  onClick={() => setEditingPriceTable([])}
                                  className="flex items-center gap-1.5 px-3 py-1.5 border text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] text-xs transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-lg border border-[#E0D8E3]">
                              <div className="max-h-80 overflow-auto">
                                <table className="w-full text-sm">
                                  <thead className="sticky top-0 bg-[#F7F4F0]">
                                    <tr>
                                      <th className="text-left py-2 px-3 font-medium text-[#A89DB0] border-b">重量(KG)</th>
                                      {(() => {
                                        const cid = carrier.id.toLowerCase();
                                        const displayTable = (priceTables[carrier.id]?.length > 0
                                          ? priceTables[carrier.id]
                                          : cid === "dhl" ? dhlPriceTable
                                          : cid === "fedex" ? fedExPriceTable
                                          : cid === "ups" ? upsPriceTable
                                          : []) as ExpressPriceTier[];
                                        const zones = getCarrierZones(carrier.id);
                                        if (zones.length > 0) {
                                          return zones.map(z => (
                                            <th key={z} className="text-right py-2 px-3 font-medium text-[#A89DB0] border-b">{z}区</th>
                                          ));
                                        }
                                        const firstTier = displayTable[0];
                                        return Object.keys(firstTier?.zonePrices || {}).map(z => (
                                          <th key={z} className="text-right py-2 px-3 font-medium text-[#A89DB0] border-b">{z}区</th>
                                        ));
                                      })()}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const cid = carrier.id.toLowerCase();
                                      const displayTable = (priceTables[carrier.id]?.length > 0
                                        ? priceTables[carrier.id]
                                        : cid === "dhl" ? dhlPriceTable
                                        : cid === "fedex" ? fedExPriceTable
                                        : cid === "ups" ? upsPriceTable
                                        : []) as ExpressPriceTier[];
                                      const zones = getCarrierZones(carrier.id);
                                      return displayTable.slice(0, 15).map((tier, idx) => (
                                        <tr key={idx} className="hover:bg-[#F7F4F0]">
                                          <td className="py-1.5 px-3 border-b font-mono">{tier.weight}</td>
                                          {(() => {
                                            const keys = zones.length > 0 ? zones : Object.keys(tier.zonePrices || {});
                                            return keys.map((zKey) => (
                                              <td key={zKey} className="py-1.5 px-3 border-b text-right font-mono">
                                                ¥{(tier.zonePrices[zKey] ?? 0).toFixed(2)}
                                              </td>
                                            ));
                                          })()}
                                        </tr>
                                      ));
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                              <p className="text-xs text-[#A89DB0] text-center py-2">
                                {priceTables[carrier.id]?.length > 0 ? "已自定义" : "默认价格表"} | 点击"编辑"可修改，支持 Excel 批量导入
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {carriers.length === 0 && (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 mx-auto mb-4 text-[#A89DB0]" />
            <h3 className="text-lg font-medium text-[#6B5B73] mb-2">暂无物流渠道</h3>
            <p className="text-sm text-[#A89DB0] mb-4">点击上方"新增渠道"按钮添加第一个物流渠道</p>
          </div>
        )}
      </div>
    </div>
  );
}
