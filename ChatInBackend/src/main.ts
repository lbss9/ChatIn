import './polyfills/node-crypto.polyfill';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { SocketIoConfigAdapter } from './shared/infrastructure/websockets/socket-io-config.adapter';
import { ApplicationExceptionFilter } from './shared/presentation/filters/application-exception.filter';

async function bootstrap() {
  const productionLogger = new ConsoleLogger({ json: true, colors: false });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, process.env.NODE_ENV === 'production' ? { logger: productionLogger } : {});
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const config = app.get(ConfigService);

  app.use(helmet());
  app.useWebSocketAdapter(new SocketIoConfigAdapter(app, config));
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApplicationExceptionFilter());
  app.enableShutdownHooks();

  if (config.get<string>('NODE_ENV') !== 'production' || config.get<string>('SWAGGER_ENABLED') === 'true') {
    const swaggerConfig = new DocumentBuilder().setTitle('ChatIn API').setDescription('API de autenticação e chat em tempo real').setVersion('1.0').build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(config.get<number>('PORT', 3001), '0.0.0.0');
}

void bootstrap();
