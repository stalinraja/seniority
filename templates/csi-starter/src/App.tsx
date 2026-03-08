import { useEffect } from "react";
import { ThemeHeader } from "./components/ThemeHeader";
import { initTheme } from "../../../packages/ui-theme/src/theme-manager";

export default function App() {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <div className="app-shell" style={{ minHeight: "100vh" }}>
      <div className="app-orb app-orb--a" aria-hidden="true" />
      <div className="app-orb app-orb--b" aria-hidden="true" />
      <div className="app-grid" aria-hidden="true" />
      <ThemeHeader />
      <main style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "20px auto", padding: "0 16px" }}>
        <section className="glass-panel" style={{ borderRadius: 16, padding: 20, borderWidth: 1, borderStyle: "solid" }}>
          <h1 style={{ margin: 0 }}>New CSI Tool Starter</h1>
          <p style={{ marginTop: 8 }}>
            This app already uses the shared `packages/ui-theme` framework.
            Build your new microservice UI on top of this shell.
          </p>
        </section>
      </main>
    </div>
  );
}
