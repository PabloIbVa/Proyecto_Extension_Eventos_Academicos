// popup.ts
interface StoredSession {
  accessToken: string;
  expiresAt: number | null;
}

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const loginBtn = document.getElementById("login-btn") as HTMLButtonElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const analyzeBtn = document.getElementById("analyze-btn") as HTMLButtonElement;

async function getSession(): Promise<StoredSession | null> {
  const result = await chrome.storage.local.get("googleSession");
  const session = result.googleSession as StoredSession | undefined;
  if (!session) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    await chrome.storage.local.remove("googleSession");
    return null;
  }
  return session;
}

function renderLoggedIn() {
  statusEl.textContent = "Sesión activa con Google ✅";
  loginBtn.classList.add("hidden");
  logoutBtn.classList.remove("hidden");
  analyzeBtn.classList.remove("hidden");
}

function renderLoggedOut() {
  statusEl.textContent = "No has iniciado sesión con Google.";
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  analyzeBtn.classList.add("hidden");
}

async function refreshUI() {
  const session = await getSession();
  if (session) {
    renderLoggedIn();
  } else {
    renderLoggedOut();
  }
}

loginBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_GOOGLE_LOGIN" });
  statusEl.textContent = "Continúa el inicio de sesión en la nueva pestaña...";
});

logoutBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    renderLoggedOut();
  });
});

analyzeBtn.addEventListener("click", async () => {
  statusEl.textContent = "Analizando página...";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage(
    { type: "ANALYZE_PAGE_CONTENT", payload: { tabId: tab?.id, url: tab?.url } },
    (response) => {
      statusEl.textContent = response?.type === "ANALYSIS_PENDING"
        ? "Solicitud enviada (pendiente de implementar backend)."
        : "Sin respuesta del background.";
    }
  );
});

// Si el usuario vuelve al popup justo después de completar el login en la
// otra pestaña, refresca el estado automáticamente.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.googleSession) {
    refreshUI();
  }
});

refreshUI();
