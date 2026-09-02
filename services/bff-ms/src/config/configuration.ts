export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendOrigins: (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // URL usada para llamadas servidor-a-servidor (BFF -> Calendar Service).
  // Dentro de Docker Compose esto es el nombre del servicio
  // (http://calendar-service:3001), no localhost.
  calendarServiceUrl:
    process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3001',
  // URL usada SOLO para la redirección de login que ve el navegador del
  // usuario (GET /auth/google). Esta SIEMPRE debe ser una URL alcanzable
  // desde la máquina del usuario (localhost o un dominio público), nunca
  // el nombre interno de un contenedor Docker.
  calendarServicePublicUrl:
    process.env.CALENDAR_SERVICE_PUBLIC_URL ??
    process.env.CALENDAR_SERVICE_URL ??
    'http://localhost:3001',
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
});
