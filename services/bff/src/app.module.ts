import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyzeModule } from './analyze/analyze.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ChatModule } from './chat/chat.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    AnalyzeModule,
    EventsModule,
    AuthModule,
    HealthModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
