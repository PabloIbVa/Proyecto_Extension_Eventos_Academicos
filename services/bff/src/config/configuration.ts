export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendOrigins: (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  calendarServiceUrl:
    process.env.CALENDAR_SERVICE_URL ?? 'http://localhost:3001',
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
});
