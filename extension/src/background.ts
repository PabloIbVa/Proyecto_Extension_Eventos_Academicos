// background.ts
// Service worker de la extensión (Manifest V3).
// Responsabilidad: manejar el ciclo de vida del login con Google. El
// análisis de contenido y la creación de eventos los hace el popup
// directamente (fetch al BFF), ya que tiene los mismos host_permissions.
export {};

const BFF_BASE_URL = "http://localhost:3000";
const AUTH_SUCCESS_URL_PREFIX = "http://localhost:3001/auth/success";

interface StoredSession {
  accessToken: string;
  expiresAt: number | null;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("[background] Extensión instalada correctamente.");
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
// Service, captura el token del fragmento de la URL, lo guarda, y cierra
// la pestaña automáticamente.
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
