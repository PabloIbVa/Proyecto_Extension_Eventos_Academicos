// background.ts
// Service worker de la extensión (Manifest V3).

const BFF_BASE_URL = "http://localhost:3000";
// Prefijo de la página de éxito servida por el Calendar Service. La
// extensión vigila cuándo una pestaña llega a esta URL para capturar el
// token del fragmento (#), en vez de que el backend intente redirigir
// directamente a chrome-extension://... (Chromium bloquea ese tipo de
// redirección iniciada desde una página http normal).
const AUTH_SUCCESS_URL_PREFIX = "http://localhost:3001/auth/success";

interface StoredSession {
  accessToken: string;
  expiresAt: number | null;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[background] Extensión instalada correctamente.");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ type: "PONG", timestamp: Date.now() });
    return true;
  }

  if (message?.type === "ANALYZE_PAGE_CONTENT") {
    console.log("[background] Contenido recibido para análisis:", message.payload);
    sendResponse({ type: "ANALYSIS_PENDING" });
    return true;
  }

  if (message?.type === "START_GOOGLE_LOGIN") {
    chrome.tabs.create({ url: `${BFF_BASE_URL}/auth/google` });
    return false;
  }

  if (message?.type === "LOGOUT") {
    chrome.storage.local.remove("googleSession").then(() => {
      sendResponse({ type: "LOGOUT_DONE" });
    });
    return true;
  }

  return false;
});

function parseFragmentParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf("#");
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
  return new URLSearchParams(fragment);
}

// Vigila cualquier pestaña que llegue a la página de éxito del Calendar
// Service. Ahí extrae el token del fragmento de la URL, lo guarda, y
// cierra la pestaña automáticamente.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const url = changeInfo.url;
  if (!url || !url.startsWith(AUTH_SUCCESS_URL_PREFIX)) return;

  const params = parseFragmentParams(url);
  const error = params.get("error");
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");

  if (error) {
    console.warn("[background] Error al iniciar sesión con Google:", error);
    chrome.tabs.remove(tabId);
    return;
  }

  if (!accessToken) return;

  const session: StoredSession = {
    accessToken,
    expiresAt: expiresIn ? Number(expiresIn) : null,
  };

  chrome.storage.local.set({ googleSession: session }).then(() => {
    console.log("[background] Sesión de Google guardada correctamente.");
    chrome.tabs.remove(tabId);
  });
});
