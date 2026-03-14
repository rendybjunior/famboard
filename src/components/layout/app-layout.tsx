import { Outlet } from "react-router-dom";
import { NavBar } from "./nav-bar";
import { OfflineBanner } from "./offline-banner";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-20 pt-4">
        <Outlet />
      </main>
      <NavBar />
    </div>
  );
}
