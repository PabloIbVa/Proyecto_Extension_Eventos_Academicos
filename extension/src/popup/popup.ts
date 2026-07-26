// popup.ts
export {};

const BFF_BASE_URL = "http://localhost:3000";

interface StoredSession {
  accessToken: string;
  expiresAt: number | null;
}

interface AnalysisResult {
  title: string;
  startDateTime: string | null;
  endDateTime: string | null;
  location: string | null;
  description: string | null;
  confidence: number;
}

type ViewName =
  | "auth"
  | "main"
  | "loading"
  | "preview"
  | "creating"
  | "success"
  | "error";

const views: Record<ViewName, HTMLElement> = {
  auth: document.getElementById("view-auth")!,
  main: document.getElementById("view-main")!,
  loading: document.getElementById("view-loading")!,
  preview: document.getElementById("view-preview")!,
  creating: document.getElementById("view-creating")!,
  success: document.getElementById("view-success")!,
  error: document.getElementById("view-error")!,
};

function showView(name: ViewName) {
  (Object.keys(views) as ViewName[]).forEach((key) => {
    views[key].classList.toggle("hidden", key !== name);
  });
}

function showError(message: string) {
  (document.getElementById("error-text") as HTMLParagraphElement).textContent = message;
  showView("error");
}

// ---------- Sesión ----------

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

async function refreshInitialView() {
  const session = await getSession();
  showView(session ? "main" : "auth");
}

// ---------- Paso 1: extraer contenido de la página activa ----------

async function extractCurrentPageContent(): Promise<{
  text: string;
  title: string;
  url: string;
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("No se encontró una pestaña activa.");
  }
  const response = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_CONTENT" });
  if (!response?.text) {
    throw new Error(
      "No se pudo leer el contenido de esta página. Prueba recargarla e inténtalo de nuevo."
    );
  }
  return response;
}

// ---------- Paso 2: analizar con el AI Service (a través del BFF) ----------

async function analyzeContent(text: string, url: string): Promise<AnalysisResult> {
  const response = await fetch(`${BFF_BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, url }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "No fue posible analizar el contenido de la página.");
  }

  return response.json();
}

// ---------- Paso 3: mostrar Vista Previa editable ----------

function isoToDateAndTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

function renderPreview(result: AnalysisResult) {
  const { date, time } = isoToDateAndTime(result.startDateTime);

  (document.getElementById("field-title") as HTMLInputElement).value = result.title ?? "";
  (document.getElementById("field-date") as HTMLInputElement).value = date;
  (document.getElementById("field-time") as HTMLInputElement).value = time;
  (document.getElementById("field-location") as HTMLInputElement).value = result.location ?? "";
  (document.getElementById("field-description") as HTMLTextAreaElement).value =
    result.description ?? "";

  const confidenceEl = document.getElementById("confidence-text") as HTMLParagraphElement;
  const pct = Math.round((result.confidence ?? 0) * 100);
  confidenceEl.textContent =
    pct < 40
      ? `Confianza baja (${pct}%). Revisa y corrige los campos antes de confirmar.`
      : `Datos detectados (confianza ${pct}%). Puedes editarlos antes de confirmar.`;

  showView("preview");
}

// ---------- Paso 4: confirmar y crear el evento real ----------

function dateAndTimeToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const local = new Date(`${date}T${time}:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

async function createEvent(accessToken: string): Promise<{ htmlLink: string }> {
  const title = (document.getElementById("field-title") as HTMLInputElement).value.trim();
  const date = (document.getElementById("field-date") as HTMLInputElement).value;
  const time = (document.getElementById("field-time") as HTMLInputElement).value;
  const location = (document.getElementById("field-location") as HTMLInputElement).value.trim();
  const description = (
    document.getElementById("field-description") as HTMLTextAreaElement
  ).value.trim();

  if (!title) throw new Error("El título es obligatorio.");
  const startDateTime = dateAndTimeToIso(date, time);
  if (!startDateTime) throw new Error("Indica una fecha y hora válidas.");

  const response = await fetch(`${BFF_BASE_URL}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      title,
      startDateTime,
      location: location || undefined,
      description: description || undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "No fue posible crear el evento en Google Calendar.");
  }

  return response.json();
}

// ---------- Eventos de la UI ----------

document.getElementById("login-btn")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_GOOGLE_LOGIN" });
});

document.getElementById("logout-btn")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    showView("auth");
  });
});

document.getElementById("analyze-btn")!.addEventListener("click", async () => {
  showView("loading");
  try {
    const { text, url } = await extractCurrentPageContent();
    const result = await analyzeContent(text, url);
    renderPreview(result);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
  }
});

document.getElementById("cancel-preview-btn")!.addEventListener("click", () => {
  showView("main");
});

document.getElementById("confirm-btn")!.addEventListener("click", async () => {
  showView("creating");
  try {
    const session = await getSession();
    if (!session) {
      showError("Tu sesión expiró. Inicia sesión de nuevo.");
      return;
    }
    const event = await createEvent(session.accessToken);
    (document.getElementById("calendar-link") as HTMLAnchorElement).href = event.htmlLink;
    showView("success");
  } catch (error) {
    showError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
  }
});

document.getElementById("finish-btn")!.addEventListener("click", () => {
  showView("main");
});

document.getElementById("retry-btn")!.addEventListener("click", () => {
  refreshInitialView();
});

// Si el login se completa mientras el popup está abierto, refresca la vista.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.googleSession) {
    refreshInitialView();
  }
});

refreshInitialView();
