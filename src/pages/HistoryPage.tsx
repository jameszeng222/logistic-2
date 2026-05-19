import { History, Trash2, Search, Package, Ruler, MapPin } from "lucide-react";
import { useHistoryStore } from "@/stores/historyStore";
import { formatPrice, formatWeight, formatDate } from "@/utils/formatter";

export default function HistoryPage() {
  const { histories, deleteHistory, clearHistory } = useHistoryStore();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E0D8E3] p-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#3E2349] flex items-center gap-2">
            <History className="w-6 h-6 text-[#C4A35A]" />
            查询历史
          </h1>
          {histories.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              清空历史
            </button>
          )}
        </div>

        {histories.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-[#A89DB0] mx-auto mb-3" />
            <p className="text-[#A89DB0]">暂无查询记录</p>
            <p className="text-[#A89DB0] text-sm mt-1">在运费查询页面进行查询后，记录将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-4">
            {histories.map((history, index) => (
              <div
                key={history.id}
                className="bg-white rounded-xl border border-[#E0D8E3] p-5 card-hover animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F7F4F0] flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#A89DB0]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#3E2349]">
                        {history.countryName}
                      </div>
                      <div className="text-xs text-[#A89DB0]">
                        {formatDate(history.queryTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#A89DB0]">
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {formatWeight(history.weight)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ruler className="w-4 h-4" />
                      {history.dimensions.l}×{history.dimensions.w}×{history.dimensions.h} cm
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {history.results.map((result) => (
                    <div
                      key={result.carrierId}
                      className="bg-[#F7F4F0] rounded-lg p-3 border border-[#F7F4F0]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: result.carrierColor }}
                        />
                        <span className="text-sm font-medium text-[#6B5B73]">
                          {result.carrierName}
                        </span>
                      </div>
                      <div className="text-lg font-bold font-mono text-[#3E2349]">
                        {formatPrice(result.totalPrice)}
                      </div>
                      <div className="text-xs text-[#A89DB0] mt-1">
                        {result.estimatedDays}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-[#F7F4F0] flex justify-end">
                  <button
                    onClick={() => deleteHistory(history.id)}
                    className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
