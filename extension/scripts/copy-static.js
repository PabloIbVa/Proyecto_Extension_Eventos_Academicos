import { cpSync, mkdirSync, existsSync } from "fs";

// Copia manifest.json, iconos y popup.html/css a dist/ para que quede
// como una carpeta lista para cargar en chrome://extensions.

mkdirSync("dist/popup", { recursive: true });
mkdirSync("dist/icons", { recursive: true });

cpSync("manifest.json", "dist/manifest.json");
cpSync("src/popup/popup.html", "dist/popup/popup.html");
cpSync("src/popup/popup.css", "dist/popup/popup.css");

if (existsSync("icons")) {
  cpSync("icons", "dist/icons", { recursive: true });
}

console.log("Archivos estáticos copiados a dist/");
