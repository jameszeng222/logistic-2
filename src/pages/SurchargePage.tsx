import { useState } from "react";
import {
  Fuel,
  Plus,
  Trash2,
  Save,
  X,
  DollarSign,
  Globe,
  AlertCircle,
  Tag,
  Calendar,
  Infinity,
} from "lucide-react";
import { useCarrierStore } from "@/stores/carrierStore";
import { useSurchargeStore } from "@/stores/surchargeStore";
import { countries } from "@/data/countries";
import type { AdditionalSurcharge } from "@/types/surcharge";

function formatDate(d: string | undefined) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("zh-CN");
}

function isActive(surcharge: AdditionalSurcharge): boolean {
  if (surcharge.isPermanent) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (surcharge.startDate) {
    const start = new Date(surcharge.startDate);
    start.setHours(0, 0, 0, 0);
    if (today < start) return false;
  }
  if (surcharge.endDate) {
    const end = new Date(surcharge.endDate);
    end.setHours(23, 59, 59, 999);
    if (today > end) return false;
  }
  return true;
}

export default function SurchargePage() {
  const { carriers } = useCarrierStore();
  const expressCarriers = carriers.filter((c) => c.billingMode === "express");

  const {
    fuelSurcharges,
    additionalSurcharges,
    setFuelSurcharge,
    removeFuelSurcharge,
    getFuelSurcharge,
    addAdditionalSurcharge,
    updateAdditionalSurcharge,
    removeAdditionalSurcharge,
    getAdditionalSurchargesByCarrier,
  } = useSurchargeStore();

  const [activeCarrier, setActiveCarrier] = useState<string>(
    expressCarriers[0]?.id || ""
  );

  const [fuelRate, setFuelRate] = useState<string>("");
  const [fuelNote, setFuelNote] = useState<string>("");
  const [showFuelEdit, setShowFuelEdit] = useState(false);

  const [newAdd, setNewAdd] = useState({
    countryCode: "",
    name: "",
    amount: "",
    isPermanent: true,
    startDate: "",
    endDate: "",
    note: "",
  });
  const [editingAddId, setEditingAddId] = useState<string | null>(null);
  const [editAddName, setEditAddName] = useState<string>("");
  const [editAddAmount, setEditAddAmount] = useState<string>("");
  const [editAddIsPermanent, setEditAddIsPermanent] = useState<boolean>(true);
  const [editAddStartDate, setEditAddStartDate] = useState<string>("");
  const [editAddEndDate, setEditAddEndDate] = useState<string>("");
  const [editAddNote, setEditAddNote] = useState<string>("");

  const currentCarrier = expressCarriers.find((c) => c.id === activeCarrier);
  const currentFuel = fuelSurcharges.find((f) => f.carrierId === activeCarrier);
  const currentAdds = getAdditionalSurchargesByCarrier(activeCarrier);

  const handleSaveFuel = () => {
    const rate = parseFloat(fuelRate);
    if (isNaN(rate) || rate < 0) return;
    setFuelSurcharge(activeCarrier, rate, fuelNote || undefined);
    setShowFuelEdit(false);
    setFuelRate("");
    setFuelNote("");
  };

  const handleAddAdditional = () => {
    if (!newAdd.countryCode || !newAdd.name || !newAdd.amount) return;
    const amount = parseFloat(newAdd.amount);
    if (isNaN(amount) || amount < 0) return;
    addAdditionalSurcharge({
      carrierId: activeCarrier,
      countryCode: newAdd.countryCode,
      name: newAdd.name,
      amount,
      isPermanent: newAdd.isPermanent,
      startDate: newAdd.isPermanent ? undefined : newAdd.startDate || undefined,
      endDate: newAdd.isPermanent ? undefined : newAdd.endDate || undefined,
      note: newAdd.note || undefined,
    });
    setNewAdd({
      countryCode: "",
      name: "",
      amount: "",
      isPermanent: true,
      startDate: "",
      endDate: "",
      note: "",
    });
  };

  const handleUpdateAdditional = (id: string) => {
    const amount = parseFloat(editAddAmount);
    if (isNaN(amount) || amount < 0) return;
    updateAdditionalSurcharge(id, {
      name: editAddName,
      amount,
      isPermanent: editAddIsPermanent,
      startDate: editAddIsPermanent ? undefined : editAddStartDate || undefined,
      endDate: editAddIsPermanent ? undefined : editAddEndDate || undefined,
      note: editAddNote || undefined,
    });
    setEditingAddId(null);
  };

  const getCountryName = (code: string) => {
    return countries.find((c) => c.code === code)?.nameCN || code;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8E3] p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#3E2349] flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#C4A35A]" />
            附加费管理
          </h1>
        </div>

        {expressCarriers.length === 0 ? (
          <div className="text-center py-12 text-[#A89DB0]">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[#A89DB0]" />
            <p>暂无快递渠道</p>
            <p className="text-sm mt-1">请先在物流渠道页面添加快递渠道（DHL/FedEx/UPS）</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {expressCarriers.map((carrier) => (
                <button
                  key={carrier.id}
                  onClick={() => {
                    setActiveCarrier(carrier.id);
                    setShowFuelEdit(false);
                    setEditingAddId(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCarrier === carrier.id
                      ? "bg-[#C4A35A] text-white"
                      : "bg-[#F7F4F0] text-[#6B5B73] hover:bg-[#E0D8E3]"
                  }`}
                >
                  {carrier.name}
                </button>
              ))}
            </div>

            {currentCarrier && (
              <div className="space-y-6">
                <div className="bg-[#F7F4F0] rounded-xl border border-[#E0D8E3] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#3E2349] flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-orange-500" />
                      燃油附加费
                    </h2>
                    <div className="flex items-center gap-2">
                      {!showFuelEdit && (
                        <button
                          onClick={() => {
                            const current = getFuelSurcharge(activeCarrier);
                            setFuelRate(current.toString());
                            setFuelNote(currentFuel?.note || "");
                            setShowFuelEdit(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Save className="w-3 h-3" />
                          {currentFuel ? "修改" : "设置"}
                        </button>
                      )}
                      {currentFuel && !showFuelEdit && (
                        <button
                          onClick={() => removeFuelSurcharge(activeCarrier)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          清除自定义
                        </button>
                      )}
                    </div>
                  </div>

                  {showFuelEdit ? (
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs text-[#A89DB0] mb-1">
                          燃油费率（如 0.18 表示 18%）
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={fuelRate}
                          onChange={(e) => setFuelRate(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs text-[#A89DB0] mb-1">
                          备注（可选）
                        </label>
                        <input
                          type="text"
                          value={fuelNote}
                          onChange={(e) => setFuelNote(e.target.value)}
                          placeholder="例如：2024年5月费率"
                          className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveFuel}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-sm transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setShowFuelEdit(false);
                          setFuelRate("");
                          setFuelNote("");
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 border border-[#E0D8E3] text-[#6B5B73] rounded-lg hover:bg-[#F7F4F0] text-sm transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-[#3E2349]">
                        {(getFuelSurcharge(activeCarrier) * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-[#A89DB0]">
                        {currentFuel ? (
                          <span className="text-emerald-600 font-medium">
                            已自定义
                          </span>
                        ) : (
                          <span>使用默认值</span>
                        )}
                        {currentFuel?.note && (
                          <span className="ml-2 text-[#A89DB0]">
                            ({currentFuel.note})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#F7F4F0] rounded-xl border border-[#E0D8E3] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#3E2349] flex items-center gap-2">
                      <Tag className="w-5 h-5 text-blue-500" />
                      附加费
                      <span className="text-sm font-normal text-[#A89DB0]">
                        （按国家/地区，可添加多种）
                      </span>
                    </h2>
                    <span className="text-xs text-[#A89DB0]">
                      共 {currentAdds.length} 条记录
                    </span>
                  </div>

                  <div className="mb-4 p-3 bg-white rounded-lg border border-[#E0D8E3] space-y-3">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-[#A89DB0] mb-1">
                          国家/地区
                        </label>
                        <select
                          value={newAdd.countryCode}
                          onChange={(e) =>
                            setNewAdd({ ...newAdd, countryCode: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                        >
                          <option value="">选择国家</option>
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.nameCN} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-40">
                        <label className="block text-xs text-[#A89DB0] mb-1">
                          附加费名称
                        </label>
                        <input
                          type="text"
                          value={newAdd.name}
                          onChange={(e) =>
                            setNewAdd({ ...newAdd, name: e.target.value })
                          }
                          placeholder="如：旺季附加费"
                          className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="w-28">
                        <label className="block text-xs text-[#A89DB0] mb-1">
                          金额 (¥)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newAdd.amount}
                          onChange={(e) =>
                            setNewAdd({ ...newAdd, amount: e.target.value })
                          }
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-[#A89DB0] mb-1">
                          备注（可选）
                        </label>
                        <input
                          type="text"
                          value={newAdd.note}
                          onChange={(e) =>
                            setNewAdd({ ...newAdd, note: e.target.value })
                          }
                          placeholder="例如：11月旺季"
                          className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="new-permanent"
                          checked={newAdd.isPermanent}
                          onChange={(e) =>
                            setNewAdd({ ...newAdd, isPermanent: e.target.checked })
                          }
                          className="w-4 h-4 text-[#C4A35A] rounded border-[#E0D8E3] focus:ring-[#C4A35A]"
                        />
                        <label htmlFor="new-permanent" className="text-sm text-[#6B5B73] flex items-center gap-1">
                          <Infinity className="w-3.5 h-3.5" />
                          长期生效
                        </label>
                      </div>
                      {!newAdd.isPermanent && (
                        <>
                          <div className="w-40">
                            <label className="block text-xs text-[#A89DB0] mb-1">
                              开始日期
                            </label>
                            <input
                              type="date"
                              value={newAdd.startDate}
                              onChange={(e) =>
                                setNewAdd({ ...newAdd, startDate: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                            />
                          </div>
                          <div className="w-40">
                            <label className="block text-xs text-[#A89DB0] mb-1">
                              结束日期
                            </label>
                            <input
                              type="date"
                              value={newAdd.endDate}
                              onChange={(e) =>
                                setNewAdd({ ...newAdd, endDate: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-[#E0D8E3] rounded-lg text-sm focus:ring-2 focus:ring-[#C4A35A] focus:border-transparent outline-none"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex-1"></div>
                      <button
                        onClick={handleAddAdditional}
                        disabled={!newAdd.countryCode || !newAdd.name || !newAdd.amount}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#C9956A] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        添加
                      </button>
                    </div>
                  </div>

                  {currentAdds.length === 0 ? (
                    <div className="text-center py-8 text-[#A89DB0] text-sm">
                      <Globe className="w-10 h-10 mx-auto mb-2 text-[#A89DB0]" />
                      暂无附加费记录
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-[#E0D8E3] overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F7F4F0]">
                          <tr>
                            <th className="text-left py-2.5 px-4 font-medium text-[#A89DB0] border-b">
                              国家/地区
                            </th>
                            <th className="text-left py-2.5 px-4 font-medium text-[#A89DB0] border-b">
                              名称
                            </th>
                            <th className="text-right py-2.5 px-4 font-medium text-[#A89DB0] border-b">
                              金额 (¥)
                            </th>
                            <th className="text-left py-2.5 px-4 font-medium text-[#A89DB0] border-b">
                              生效时间
                            </th>
                            <th className="text-left py-2.5 px-4 font-medium text-[#A89DB0] border-b">
                              备注
                            </th>
                            <th className="text-center py-2.5 px-4 font-medium text-[#A89DB0] border-b w-24">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentAdds.map((add) => {
                            const active = isActive(add);
                            return (
                              <tr
                                key={add.id}
                                className={`hover:bg-[#F7F4F0] ${
                                  !active ? "opacity-50" : ""
                                }`}
                              >
                                <td className="py-2.5 px-4 border-b">
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5 text-[#A89DB0]" />
                                    <span>{getCountryName(add.countryCode)}</span>
                                    <span className="text-xs text-[#A89DB0]">
                                      ({add.countryCode})
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4 border-b">
                                  {editingAddId === add.id ? (
                                    <input
                                      type="text"
                                      value={editAddName}
                                      onChange={(e) =>
                                        setEditAddName(e.target.value)
                                      }
                                      className="w-full px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="font-medium text-[#3E2349]">
                                      {add.name}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 border-b text-right">
                                  {editingAddId === add.id ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editAddAmount}
                                      onChange={(e) =>
                                        setEditAddAmount(e.target.value)
                                      }
                                      className="w-24 px-2 py-1 border border-[#E0D8E3] rounded text-right text-sm"
                                    />
                                  ) : (
                                    <span className="font-mono font-medium">
                                      ¥{add.amount.toFixed(2)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 border-b">
                                  {editingAddId === add.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={editAddIsPermanent}
                                        onChange={(e) =>
                                          setEditAddIsPermanent(e.target.checked)
                                        }
                                        className="w-4 h-4 text-[#C4A35A] rounded border-[#E0D8E3]"
                                      />
                                      <span className="text-xs text-[#A89DB0]">长期</span>
                                      {!editAddIsPermanent && (
                                        <>
                                          <input
                                            type="date"
                                            value={editAddStartDate}
                                            onChange={(e) =>
                                              setEditAddStartDate(e.target.value)
                                            }
                                            className="px-2 py-1 border border-[#E0D8E3] rounded text-xs"
                                          />
                                          <span className="text-xs text-[#A89DB0]">至</span>
                                          <input
                                            type="date"
                                            value={editAddEndDate}
                                            onChange={(e) =>
                                              setEditAddEndDate(e.target.value)
                                            }
                                            className="px-2 py-1 border border-[#E0D8E3] rounded text-xs"
                                          />
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      {add.isPermanent ? (
                                        <>
                                          <Infinity className="w-3.5 h-3.5 text-emerald-500" />
                                          <span className="text-xs text-emerald-600">
                                            长期生效
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <Calendar className="w-3.5 h-3.5 text-[#A89DB0]" />
                                          <span className="text-xs text-[#A89DB0]">
                                            {formatDate(add.startDate)} ~{" "}
                                            {formatDate(add.endDate)}
                                          </span>
                                        </>
                                      )}
                                      {!active && (
                                        <span className="text-xs text-red-500 ml-1">
                                          (已过期)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 border-b text-[#A89DB0]">
                                  {editingAddId === add.id ? (
                                    <input
                                      type="text"
                                      value={editAddNote}
                                      onChange={(e) =>
                                        setEditAddNote(e.target.value)
                                      }
                                      className="w-full px-2 py-1 border border-[#E0D8E3] rounded text-sm"
                                    />
                                  ) : (
                                    add.note || "-"
                                  )}
                                </td>
                                <td className="py-2.5 px-4 border-b">
                                  <div className="flex items-center justify-center gap-1">
                                    {editingAddId === add.id ? (
                                      <>
                                        <button
                                          onClick={() => handleUpdateAdditional(add.id)}
                                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                          title="保存"
                                        >
                                          <Save className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingAddId(null);
                                            setEditAddName("");
                                            setEditAddAmount("");
                                            setEditAddIsPermanent(true);
                                            setEditAddStartDate("");
                                            setEditAddEndDate("");
                                            setEditAddNote("");
                                          }}
                                          className="p-1 text-[#A89DB0] hover:bg-[#F7F4F0] rounded transition-colors"
                                          title="取消"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingAddId(add.id);
                                            setEditAddName(add.name);
                                            setEditAddAmount(add.amount.toString());
                                            setEditAddIsPermanent(add.isPermanent);
                                            setEditAddStartDate(add.startDate || "");
                                            setEditAddEndDate(add.endDate || "");
                                            setEditAddNote(add.note || "");
                                          }}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="编辑"
                                        >
                                          <svg
                                            className="w-3.5 h-3.5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() =>
                                            removeAdditionalSurcharge(add.id)
                                          }
                                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                          title="删除"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
