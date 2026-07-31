import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import { trackClientError } from "./lib/analytics.ts";
import "./index.css";

window.addEventListener("error", event => trackClientError(event.error || event.message, "window.error"));
window.addEventListener("unhandledrejection", event => trackClientError(event.reason, "window.unhandledrejection"));

createRoot(document.getElementById("root")!).render(<AppErrorBoundary><App /></AppErrorBoundary>);
