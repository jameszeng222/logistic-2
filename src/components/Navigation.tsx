import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Search, FileSpreadsheet, Truck, DollarSign, History, RefreshCw, Check, AlertCircle } from "lucide-react";
import { loadAllData } from "@/services/dataService";

const navItems = [
  { path: "/", label: "运费查询", icon: Search },
  { path: "/templates", label: "运费模板", icon: FileSpreadsheet },
  { path: "/channels", label: "物流渠道", icon: Truck },
  { path: "/surcharges", label: "附加费管理", icon: DollarSign },
  { path: "/history", label: "查询历史", icon: History },
];

export default function Navigation() {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  const handleSync = async () => {
    setSyncStatus("syncing");
    setSyncMessage("正在同步...");

    try {
      const data = await loadAllData();
      const totalRecords = Object.values(data.metadata.recordCounts).reduce((a, b) => a + b, 0);
      setSyncStatus("success");
      setSyncMessage(`同步成功！共 ${totalRecords} 条记录`);

      // 3秒后恢复状态
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
      }, 3000);

      // 刷新页面以应用新数据
      window.location.reload();
    } catch (error) {
      setSyncStatus("error");
      setSyncMessage("同步失败，请重试");
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage("");
      }, 3000);
    }
  };

  return (
    <nav className="bg-[#3E2349] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C4A35A] to-[#B08D4A] flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">跨境物流运费查询</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 同步按钮 */}
            <button
              onClick={handleSync}
              disabled={syncStatus === "syncing"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                syncStatus === "syncing"
                  ? "bg-[#4E3359] text-[#A89DB0] cursor-wait"
                  : syncStatus === "success"
                  ? "bg-green-600 text-white"
                  : syncStatus === "error"
                  ? "bg-red-600 text-white"
                  : "bg-[#C4A35A] text-white hover:bg-[#D4B36A]"
              }`}
              title={syncMessage || "从飞书同步最新价格数据"}
            >
              {syncStatus === "syncing" ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : syncStatus === "success" ? (
                <Check className="w-4 h-4" />
              ) : syncStatus === "error" ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {syncStatus === "syncing"
                  ? "同步中..."
                  : syncStatus === "success"
                  ? "已同步"
                  : syncStatus === "error"
                  ? "失败"
                  : "同步数据"}
              </span>
            </button>

            {/* 导航链接 */}
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#C4A35A] text-white"
                      : "text-[#A89DB0] hover:text-white hover:bg-[#4E3359]"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
