import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#F7F4F0]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
