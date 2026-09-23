import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      window.dispatchEvent(new CustomEvent("govza:sw-registration", { detail: registration }));

      const checkForUpdate = () => registration.update().catch(() => {});
      window.addEventListener("focus", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    } catch (error) {
      console.warn("SW registration failed:", error);
    }
  };

  if (document.readyState === "complete") {
    void registerServiceWorker();
  } else {
    window.addEventListener("load", () => { void registerServiceWorker(); }, { once: true });
  }
}
