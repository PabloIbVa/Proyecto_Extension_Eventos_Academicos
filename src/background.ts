// background.ts
// Service worker de la extensión (Manifest V3).
// Aquí vivirá la lógica que no depende del DOM: comunicación con el BFF,
// manejo del flujo de autenticación y mensajería entre popup y content-script.

const BFF_BASE_URL = "http://localhost:3000";

chrome.runtime.onInstalled.addListener(() => {
  console.log("[background] Extensión instalada correctamente.");
});

// Escucha mensajes enviados desde el content-script o el popup.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ type: "PONG", timestamp: Date.now() });
    return true;
  }

  if (message?.type === "ANALYZE_PAGE_CONTENT") {
    // Placeholder: aquí se llamará al BFF (NestJS) para enviar el contenido
    // extraído de la página al AI Processing Service y recibir la propuesta
    // de evento (título, fecha, hora, confianza).
    console.log("[background] Contenido recibido para análisis:", message.payload);
    sendResponse({ type: "ANALYSIS_PENDING" });
    return true;
  }

  return false;
});

// Placeholder para iniciar el flujo de login contra el backend (Opción A:
// el Google Calendar Service gestiona el OAuth, la extensión solo abre
// la ventana de login y espera la confirmación).
export async function startGoogleLogin(): Promise<void> {
  const authUrl = `${BFF_BASE_URL}/auth/google`;
  await chrome.tabs.create({ url: authUrl });
}
