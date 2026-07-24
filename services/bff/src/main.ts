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

  // La extensión llama desde un origen "chrome-extension://<id>", no desde
  // un dominio http normal, así que se permite explícitamente además de
  // los orígenes configurados en FRONTEND_ORIGINS (.env).
  const configuredOrigins = configService.get<string[]>('frontendOrigins') ?? [];
  app.enableCors({
    origin: (origin, callback) => {
      const isChromeExtension = origin?.startsWith('chrome-extension://');
      const isAllowedOrigin = origin ? configuredOrigins.includes(origin) : false;
      if (!origin || isChromeExtension || isAllowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      }
    },
    credentials: true,
  });

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`BFF escuchando en http://localhost:${port}`);
}
bootstrap();
