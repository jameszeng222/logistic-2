import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import QueryPage from "@/pages/QueryPage";
import TemplatesPage from "@/pages/TemplatesPage";
import ChannelsPage from "@/pages/ChannelsPage";
import SurchargePage from "@/pages/SurchargePage";
import HistoryPage from "@/pages/HistoryPage";
import { loadAllData, clearCache } from "@/services/dataService";

function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    const doSync = async () => {
      setIsSyncing(true);
      setSyncError("");
      try {
        // 清除缓存，强制从服务器获取最新数据
        clearCache();
        await loadAllData();
        console.log("[App] Initial sync completed");
      } catch (error) {
        console.error("[App] Initial sync failed:", error);
        setSyncError("数据同步失败，请刷新页面重试");
      } finally {
        setIsSyncing(false);
      }
    };

    doSync();

    // 每5分钟自动同步一次
    const interval = setInterval(() => {
      loadAllData().catch(console.error);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (isSyncing) {
    return (
      <div className="min-h-screen bg-[#F7F4F0] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#C4A35A] animate-spin mx-auto mb-4" />
          <p className="text-[#3E2349] font-medium">正在同步最新数据...</p>
          <p className="text-[#A89DB0] text-sm mt-1">首次加载可能需要几秒钟</p>
        </div>
      </div>
    );
  }

  if (syncError) {
    return (
      <div className="min-h-screen bg-[#F7F4F0] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">{syncError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#C4A35A] text-white rounded-lg hover:bg-[#D4B36A] transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <DataSyncProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<QueryPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="surcharges" element={<SurchargePage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </DataSyncProvider>
    </BrowserRouter>
  );
}
