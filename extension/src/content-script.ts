// content-script.ts
// Se inyecta en cada página visitada. Extrae el texto relevante (evitando
// menús, pies de página, scripts, etc.) cuando el popup lo solicita.
export {};

const NOISE_SELECTORS = "script, style, nav, footer, header, aside, noscript, iframe, svg";
const MAX_CHARS = 8000;

interface ExtractedContent {
  text: string;
  title: string;
  url: string;
}

function extractPageContent(): ExtractedContent {
  // Se clona el <body> para no modificar la página real del usuario.
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(NOISE_SELECTORS).forEach((el) => el.remove());

  // Si la página tiene <main> o <article>, ahí suele estar el contenido
  // real (evita repetir menús laterales, banners, etc.).
  const focused = clone.querySelector("main, article") as HTMLElement | null;
  const source = focused ?? clone;

  // textContent (no innerText) porque el clon está desconectado del DOM
  // y innerText depende del layout renderizado, que un nodo desconectado
  // no tiene.
  let text = (source.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS);
  }

  return { text, title: document.title, url: window.location.href };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "EXTRACT_CONTENT") {
    sendResponse(extractPageContent());
    return true;
  }
  return false;
});
