// popup.ts
export {};

const BFF_BASE_URL = "http://localhost:3000";
const APP_VERSION = "0.2.0";

// ---------- Tipos ----------

interface StoredSession {
  accessToken: string;
  expiresAt: number | null;
  email: string | null;
}

interface Preferences {
  language: "es" | "en";
  timeZone: string;
  theme: "dark" | "light";
}

interface AnalysisResult {
  title: string;
  startDateTime: string | null;
  endDateTime: string | null;
  location: string | null;
  description: string | null;
  confidence: number;
}

interface EventState {
  title: string | null;
  startDateTime: string | null;
  location: string | null;
  description: string | null;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface ChatResult {
  reply: string;
  event: EventState;
  missingFields: string[];
}

type ViewName =
  | "auth"
  | "main"
  | "loading"
  | "preview"
  | "chat"
  | "creating"
  | "success"
  | "error"
  | "settings";

let chatHistory: ChatTurn[] = [];
let preferences: Preferences = {
  language: "es",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  theme: "dark",
};
let lastNonSettingsView: ViewName = "auth";
let successReturnTimer: number | null = null;
let activeAnalysisAbortController: AbortController | null = null;

// ---------- i18n ----------

const TRANSLATIONS: Record<string, Record<Preferences["language"], string>> = {
  appTitle: { es: "AulaPlan", en: "AulaPlan" },
  authEyebrow: { es: "Calendario inteligente", en: "Smart calendar" },
  authStatus: {
    es: "Inicia sesion con Google para convertir paginas academicas en tareas de calendario.",
    en: "Sign in with Google to turn academic pages into calendar tasks.",
  },
  loginBtn: { es: "Iniciar sesion con Google", en: "Sign in with Google" },
  mainEyebrow: { es: "Extension activa", en: "Extension ready" },
  welcomeTitle: {
    es: "Hola, listo para organizar tu dia.",
    en: "Hi, ready to organize your day.",
  },
  mainSessionActive: { es: "Sesion activa con Google", en: "Signed in with Google" },
  analyzeBtn: { es: "Analizar pagina actual", en: "Analyze current page" },
  cancelAnalysisBtn: { es: "Cancelar analisis", en: "Cancel analysis" },
  loadingTitle: { es: "Revisando la pagina", en: "Reviewing the page" },
  loadingText: {
    es: "Estamos detectando fecha, hora y detalles importantes.",
    en: "Detecting date, time, and important details.",
  },
  previewEyebrow: { es: "Vista previa", en: "Preview" },
  previewTitle: { es: "Nueva asignacion", en: "New assignment" },
  chatEyebrow: { es: "Ajustes con IA", en: "AI edits" },
  chatViewTitle: { es: "Refinar asignacion", en: "Refine assignment" },
  chatTitle: { es: "Asistente", en: "Assistant" },
  chatHelp: {
    es: "Pidele cambios y actualizare los datos de la asignacion.",
    en: "Ask for changes and I will update the assignment details.",
  },
  chatPlaceholder: {
    es: "Ej. cambialo al viernes a las 3pm",
    en: "E.g. move it to Friday at 3pm",
  },
  chatSend: { es: "Enviar", en: "Send" },
  chatUpdated: { es: "Cambios listos para revisar.", en: "Changes ready to review." },
  returnFormBtn: { es: "Ver formulario actualizado", en: "View updated form" },
  openChatBtn: { es: "Chatear con IA", en: "Chat with AI" },
  backBtn: { es: "Regresar", en: "Back" },
  fieldTitle: { es: "Titulo", en: "Title" },
  fieldDate: { es: "Fecha", en: "Date" },
  fieldTime: { es: "Hora", en: "Time" },
  fieldLocation: { es: "Ubicacion", en: "Location" },
  fieldDescription: { es: "Descripcion", en: "Description" },
  confirmBtn: { es: "Agregar al calendario", en: "Add to calendar" },
  creatingTitle: { es: "Preparando tu calendario", en: "Preparing your calendar" },
  creatingText: {
    es: "Creando el evento en Google Calendar...",
    en: "Creating the event in Google Calendar...",
  },
  successText: { es: "Asignacion agregada", en: "Assignment added" },
  openCalendar: { es: "Abrir en Google Calendar", en: "Open in Google Calendar" },
  finishBtn: { es: "Analizar otra pagina", en: "Analyze another page" },
  errorTitle: { es: "Algo no salio bien", en: "Something went wrong" },
  retryBtn: { es: "Volver a intentar", en: "Try again" },
  settingsEyebrow: { es: "Preferencias", en: "Preferences" },
  settingsTitle: { es: "Configuracion", en: "Settings" },
  settingsLanguage: { es: "Idioma", en: "Language" },
  settingsTimezone: { es: "Zona horaria", en: "Time zone" },
  settingsAccount: { es: "Cuenta conectada", en: "Connected account" },
  logoutBtn: { es: "Cerrar sesion", en: "Sign out" },
  closeBtn: { es: "Cerrar", en: "Close" },
  noAccount: { es: "No hay cuenta conectada", en: "No account connected" },
  versionLabel: { es: "Version", en: "Version" },
};

function t(key: string): string {
  return TRANSLATIONS[key]?.[preferences.language] ?? key;
}

function applyTranslations() {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n!;
    el.textContent = t(key);
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder!;
    el.placeholder = t(key);
  });
  document.documentElement.lang = preferences.language;
  (document.getElementById("version-text") as HTMLParagraphElement).textContent =
    `${t("versionLabel")} ${APP_VERSION}`;
}

function applyTheme() {
  document.body.classList.toggle("light-theme", preferences.theme === "light");
  const icon = document.getElementById("theme-toggle-icon");
  if (icon) icon.textContent = preferences.theme === "light" ? "☀" : "☾";
}

// ---------- Zonas horarias ----------

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/Tijuana", label: "Tijuana (GMT-8/-7)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Guatemala", label: "Guatemala (GMT-6)" },
  { value: "America/Costa_Rica", label: "Costa Rica (GMT-6)" },
  { value: "America/Panama", label: "Panamá (GMT-5)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/New_York", label: "Nueva York (GMT-5/-4)" },
  { value: "America/Chicago", label: "Chicago (GMT-6/-5)" },
  { value: "America/Denver", label: "Denver (GMT-7/-6)" },
  { value: "America/Los_Angeles", label: "Los Ángeles (GMT-8/-7)" },
  { value: "America/Toronto", label: "Toronto (GMT-5/-4)" },
  { value: "America/Caracas", label: "Caracas (GMT-4)" },
  { value: "America/Santiago", label: "Santiago (GMT-4/-3)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1/+2)" },
  { value: "Europe/London", label: "Londres (GMT+0/+1)" },
  { value: "Europe/Paris", label: "París (GMT+1/+2)" },
  { value: "Asia/Tokyo", label: "Tokio (GMT+9)" },
  { value: "Australia/Sydney", label: "Sídney (GMT+10/+11)" },
];

function populateTimezoneSelect() {
  const select = document.getElementById("setting-timezone") as HTMLSelectElement;
  select.innerHTML = "";

  const knownValues = new Set(TIMEZONE_OPTIONS.map((o) => o.value));
  const options = [...TIMEZONE_OPTIONS];
  // Si la zona detectada del navegador no está en la lista curada, se
  // agrega igual para no forzar al usuario a una zona incorrecta.
  if (!knownValues.has(preferences.timeZone)) {
    options.unshift({ value: preferences.timeZone, label: `${preferences.timeZone} (detectada)` });
  }

  for (const opt of options) {
    const optionEl = document.createElement("option");
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    select.appendChild(optionEl);
  }
  select.value = preferences.timeZone;
}

// ---------- Preferencias (idioma / zona horaria) ----------

async function loadPreferences() {
  const result = await chrome.storage.local.get("preferences");
  const stored = result.preferences as Partial<Preferences> | undefined;
  preferences = {
    language: stored?.language ?? preferences.language,
    timeZone: stored?.timeZone ?? preferences.timeZone,
    theme: stored?.theme ?? preferences.theme,
  };
}

async function savePreferences() {
  await chrome.storage.local.set({ preferences });
}

// ---------- Vistas ----------

const views: Record<ViewName, HTMLElement> = {
  auth: document.getElementById("view-auth")!,
  main: document.getElementById("view-main")!,
  loading: document.getElementById("view-loading")!,
  preview: document.getElementById("view-preview")!,
  chat: document.getElementById("view-chat")!,
  creating: document.getElementById("view-creating")!,
  success: document.getElementById("view-success")!,
  error: document.getElementById("view-error")!,
  settings: document.getElementById("view-settings")!,
};

function showView(name: ViewName) {
  if (successReturnTimer && name !== "success") {
    window.clearTimeout(successReturnTimer);
    successReturnTimer = null;
  }
  if (name !== "settings") lastNonSettingsView = name;
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
  if (session) {
    (document.getElementById("main-session-text") as HTMLParagraphElement).textContent = t(
      "mainSessionActive"
    );
    showView("main");
  } else {
    showView("auth");
  }
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

function cancelActiveAnalysis() {
  if (!activeAnalysisAbortController) {
    showView("main");
    return;
  }

  activeAnalysisAbortController.abort();
  activeAnalysisAbortController = null;
  showView("main");
}

async function analyzeContent(text: string, url: string, signal?: AbortSignal): Promise<AnalysisResult> {
  const response = await fetch(`${BFF_BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, url }),
    signal,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "No fue posible analizar el contenido de la página.");
  }

  return response.json();
}

// ---------- Fechas: SIEMPRE se manejan como hora "naive" (sin zona) ----------
// La zona horaria real se guarda por separado en `preferences.timeZone` y
// se manda explícita a Google Calendar. Nunca se usa `new Date(iso)` +
// toISOString() aquí, porque eso reinterpreta la hora con la zona del
// navegador y corrompe el dato.

function isoToDateAndTime(naive: string | null): { date: string; time: string } {
  if (!naive) return { date: "", time: "" };
  const match = naive.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return { date: "", time: "" };
  return { date: match[1], time: match[2] };
}

function dateAndTimeToNaiveIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  return `${date}T${time}:00`;
}

// ---------- Paso 3: mostrar Vista Previa editable ----------

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
      ? `Confianza baja: ${pct}%. Revisa los campos.`
      : `Datos detectados: ${pct}% de confianza.`;

  showView("preview");
  startChatForPreview();
}

// ---------- Chat del asistente (rellenar y modificar datos por conversación) ----------

function getCurrentEventFromFields(): EventState {
  const title = (document.getElementById("field-title") as HTMLInputElement).value.trim();
  const date = (document.getElementById("field-date") as HTMLInputElement).value;
  const time = (document.getElementById("field-time") as HTMLInputElement).value;
  const location = (document.getElementById("field-location") as HTMLInputElement).value.trim();
  const description = (
    document.getElementById("field-description") as HTMLTextAreaElement
  ).value.trim();

  return {
    title: title || null,
    startDateTime: dateAndTimeToNaiveIso(date, time),
    location: location || null,
    description: description || null,
  };
}

function applyEventStateToFields(event: EventState) {
  if (event.title !== null) {
    (document.getElementById("field-title") as HTMLInputElement).value = event.title;
  }
  if (event.startDateTime !== null) {
    const { date, time } = isoToDateAndTime(event.startDateTime);
    (document.getElementById("field-date") as HTMLInputElement).value = date;
    (document.getElementById("field-time") as HTMLInputElement).value = time;
  }
  if (event.location !== null) {
    (document.getElementById("field-location") as HTMLInputElement).value = event.location;
  }
  if (event.description !== null) {
    (document.getElementById("field-description") as HTMLTextAreaElement).value =
      event.description;
  }
}

function appendChatBubble(role: "user" | "assistant", text: string): HTMLDivElement {
  const transcript = document.getElementById("chat-transcript") as HTMLDivElement;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  transcript.appendChild(bubble);
  transcript.scrollTop = transcript.scrollHeight;
  return bubble;
}

function setChatInputEnabled(enabled: boolean) {
  (document.getElementById("chat-input") as HTMLInputElement).disabled = !enabled;
  (document.getElementById("chat-send-btn") as HTMLButtonElement).disabled = !enabled;
}

async function callChat(message: string, isGreeting: boolean): Promise<ChatResult> {
  const response = await fetch(`${BFF_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      currentEvent: getCurrentEventFromFields(),
      history: chatHistory,
      isGreeting,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "El asistente no está disponible en este momento.");
  }

  return response.json();
}

async function sendChatMessage(message: string, isGreeting = false) {
  setChatInputEnabled(false);
  const typingBubble = appendChatBubble("assistant", "Escribiendo...");
  typingBubble.classList.add("typing");

  try {
    const result = await callChat(message, isGreeting);

    typingBubble.remove();
    appendChatBubble("assistant", result.reply);
    applyEventStateToFields(result.event);
    if (!isGreeting) {
      document.getElementById("chat-update-text")!.classList.remove("hidden");
    }

    if (!isGreeting) {
      chatHistory.push({ role: "user", content: message });
    }
    chatHistory.push({ role: "assistant", content: result.reply });
  } catch (error) {
    typingBubble.remove();
    appendChatBubble(
      "assistant",
      error instanceof Error ? error.message : "Ocurrió un error inesperado."
    );
  } finally {
    setChatInputEnabled(true);
    (document.getElementById("chat-input") as HTMLInputElement).focus();
  }
}

function startChatForPreview() {
  chatHistory = [];
  (document.getElementById("chat-transcript") as HTMLDivElement).innerHTML = "";
  document.getElementById("chat-update-text")!.classList.add("hidden");
  void sendChatMessage("", true);
}

// ---------- Paso 4: confirmar y crear el evento real ----------

async function createEvent(accessToken: string): Promise<{ htmlLink: string }> {
  const title = (document.getElementById("field-title") as HTMLInputElement).value.trim();
  const date = (document.getElementById("field-date") as HTMLInputElement).value;
  const time = (document.getElementById("field-time") as HTMLInputElement).value;
  const location = (document.getElementById("field-location") as HTMLInputElement).value.trim();
  const description = (
    document.getElementById("field-description") as HTMLTextAreaElement
  ).value.trim();

  if (!title) throw new Error("El título es obligatorio.");
  const startDateTime = dateAndTimeToNaiveIso(date, time);
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
      timeZone: preferences.timeZone,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "No fue posible crear el evento en Google Calendar.");
  }

  return response.json();
}

// ---------- Configuración (I-08) ----------

async function openSettings() {
  const session = await getSession();
  (document.getElementById("connected-account-text") as HTMLParagraphElement).textContent =
    session?.email ?? t("noAccount");
  (document.getElementById("setting-language") as HTMLSelectElement).value = preferences.language;
  populateTimezoneSelect();
  showView("settings");
}

// ---------- Eventos de la UI ----------

document.getElementById("login-btn")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "START_GOOGLE_LOGIN" });
});

document.getElementById("settings-btn")!.addEventListener("click", () => {
  void openSettings();
});

document.getElementById("theme-toggle-btn")!.addEventListener("click", () => {
  preferences.theme = preferences.theme === "dark" ? "light" : "dark";
  applyTheme();
  void savePreferences();
});

document.getElementById("close-settings-btn")!.addEventListener("click", () => {
  showView(lastNonSettingsView === "settings" ? "main" : lastNonSettingsView);
});

document.getElementById("setting-language")!.addEventListener("change", (event) => {
  preferences.language = (event.target as HTMLSelectElement).value as Preferences["language"];
  void savePreferences();
  applyTranslations();
});

document.getElementById("setting-timezone")!.addEventListener("change", (event) => {
  preferences.timeZone = (event.target as HTMLSelectElement).value;
  void savePreferences();
});

document.getElementById("logout-btn")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => {
    showView("auth");
  });
});

document.getElementById("analyze-btn")!.addEventListener("click", async () => {
  const controller = new AbortController();
  activeAnalysisAbortController = controller;
  showView("loading");

  try {
    const { text, url } = await extractCurrentPageContent();
    const result = await analyzeContent(text, url, controller.signal);
    activeAnalysisAbortController = null;
    renderPreview(result);
  } catch (error) {
    activeAnalysisAbortController = null;

    if (error instanceof DOMException && error.name === "AbortError") {
      showView("main");
      return;
    }

    showError(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
  }
});

document.getElementById("cancel-analysis-btn")!.addEventListener("click", () => {
  cancelActiveAnalysis();
});

document.getElementById("cancel-preview-btn")!.addEventListener("click", () => {
  showView("main");
});

document.getElementById("open-chat-btn")!.addEventListener("click", () => {
  showView("chat");
  (document.getElementById("chat-input") as HTMLInputElement).focus();
});

document.getElementById("return-form-btn")!.addEventListener("click", () => {
  showView("preview");
});

document.getElementById("chat-send-btn")!.addEventListener("click", () => {
  const input = document.getElementById("chat-input") as HTMLInputElement;
  const message = input.value.trim();
  if (!message) return;
  appendChatBubble("user", message);
  input.value = "";
  void sendChatMessage(message);
});

document.getElementById("chat-input")!.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    (document.getElementById("chat-send-btn") as HTMLButtonElement).click();
  }
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
    successReturnTimer = window.setTimeout(() => {
      showView("main");
    }, 2400);
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

// ---------- Arranque ----------

(async () => {
  await loadPreferences();
  applyTheme();
  applyTranslations();
  await refreshInitialView();
})();
