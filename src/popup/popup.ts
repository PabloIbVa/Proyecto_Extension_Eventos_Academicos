// popup.ts
const statusEl = document.getElementById("status") as HTMLParagraphElement;
const analyzeBtn = document.getElementById("analyze-btn") as HTMLButtonElement;

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
