import { Outlet, useLocation } from "react-router";
import { Header } from "../components/Header";
import { AppGuidelines } from "../components/AppGuidelines";
import { SiteFooter } from "../components/SiteFooter";
import { NavigationTutorial } from "../components/NavigationTutorial";

export function Root() {
  const location = useLocation();
  const showGuidelines = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <NavigationTutorial />
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
      {showGuidelines ? <AppGuidelines /> : null}
      <SiteFooter />
    </div>
  );
}
