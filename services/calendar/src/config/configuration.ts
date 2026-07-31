export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    // Debe coincidir EXACTAMENTE con el redirect URI configurado en
    // Google Cloud Console (Paso 1 del proyecto).
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      'http://localhost:3001/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/calendar.events',
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  },
});
