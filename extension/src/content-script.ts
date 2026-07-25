// content-script.ts
// Se inyecta en las páginas visitadas. De momento solo confirma que carga
// correctamente; más adelante extraerá el contenido académico relevante
// (fechas, títulos de tareas, avisos) para enviarlo al background.

console.log("[content-script] Cargado en:", window.location.href);

// Placeholder de extracción de contenido. Se reemplazará por la lógica real
// de detección de texto académico en el MVP correspondiente.
function extractPageText(): string {
  return document.body?.innerText?.slice(0, 5000) ?? "";
}

// Ejemplo de comunicación con el background (comentado hasta que exista
// un disparador real, como un botón inyectado o un menú contextual).
// chrome.runtime.sendMessage({
//   type: "ANALYZE_PAGE_CONTENT",
//   payload: { text: extractPageText(), url: window.location.href },
// });
