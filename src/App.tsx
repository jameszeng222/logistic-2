import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import QueryPage from "@/pages/QueryPage";
import TemplatesPage from "@/pages/TemplatesPage";
import ChannelsPage from "@/pages/ChannelsPage";
import SurchargePage from "@/pages/SurchargePage";
import HistoryPage from "@/pages/HistoryPage";
import { loadAllData, clearCache } from "@/services/dataService";
import { loadSyncData, applySyncData, shouldSync, getLastSyncTime } from "@/services/syncService";

function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const doSync = async () => {
      setIsSyncing(true);
      setSyncError("");
      try {
        // 清除缓存，强制从服务器获取最新数据
        clearCache();
        await loadAllData();

        // 尝试从飞书同步数据
        const syncData = await loadSyncData();
        if (syncData) {
          applySyncData(syncData);
          setLastSync(getLastSyncTime());
        }

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
      if (shouldSync()) {
        loadSyncData().then(data => {
          if (data) {
            applySyncData(data);
            setLastSync(getLastSyncTime());
          }
        }).catch(console.error);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncError("");
    try {
      clearCache();
      await loadAllData();
      const syncData = await loadSyncData();
      if (syncData) {
        applySyncData(syncData);
        setLastSync(getLastSyncTime());
      }
    } catch (error) {
      console.error("[App] Manual sync failed:", error);
      setSyncError("数据同步失败，请刷新页面重试");
    } finally {
      setIsSyncing(false);
    }
  };

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

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {lastSync && (
          <span className="text-xs text-[#A89DB0] bg-white/80 px-2 py-1 rounded">
            同步: {new Date(lastSync).toLocaleString('zh-CN')}
          </span>
        )}
        <button
          onClick={handleManualSync}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#3E2349] text-white text-sm rounded-lg hover:bg-[#5A3A6A] transition-colors shadow-lg"
          title="手动同步飞书数据"
        >
          <RefreshCw className="w-4 h-4" />
          同步
        </button>
      </div>
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/logistic-2">
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
