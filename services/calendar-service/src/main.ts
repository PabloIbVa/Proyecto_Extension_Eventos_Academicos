import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Este servicio lo llama principalmente el BFF (servidor a servidor, sin
  // CORS), pero se permite también chrome-extension:// y localhost por si
  // se prueba directamente durante el desarrollo.
  app.enableCors({
    origin: (origin, callback) => {
      const isChromeExtension = origin?.startsWith('chrome-extension://');
      const isLocalhost = origin?.startsWith('http://localhost');
      if (!origin || isChromeExtension || isLocalhost) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    credentials: true,
  });

  const port = configService.get<number>('port') ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Google Calendar Service escuchando en http://localhost:${port}`);
}
bootstrap();
