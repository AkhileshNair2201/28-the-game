import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnvConfig } from './config/env';

async function bootstrap() {
  const env = loadEnvConfig();
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin,
    credentials: true
  });
  app.setGlobalPrefix('api');

  const requestWindowByIp = new Map<string, { startedAt: number; count: number }>();

  app.use((
    req: { ip?: string; socket: { remoteAddress?: string } },
    res: {
      setHeader: (name: string, value: string) => void;
      status: (code: number) => { json: (value: { message: string }) => void };
    },
    next: () => void
  ) => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const current = requestWindowByIp.get(key);

    if (!current || now - current.startedAt > env.rateLimitWindowMs) {
      requestWindowByIp.set(key, { startedAt: now, count: 1 });
    } else {
      current.count += 1;
      requestWindowByIp.set(key, current);

      if (current.count > env.rateLimitMax) {
        res.status(429).json({
          message: 'Rate limit exceeded.'
        });
        return;
      }
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });

  await app.listen(env.port);
}

void bootstrap();
