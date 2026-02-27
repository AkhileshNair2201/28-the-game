import { describe, expect, it } from 'vitest';
import { AppService } from './app.service';

describe('AppService', () => {
  it('returns health payload', () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5434';
    process.env.DB_NAME = 'twentyeight';
    process.env.DB_USER = 'twentyeight';
    process.env.DB_PASSWORD = 'twentyeight_dev_password';

    const service = new AppService();
    expect(service.getHealth()).toEqual({
      status: 'ok',
      service: 'twenty-eight-api',
      database: {
        host: 'localhost',
        port: 5434,
        name: 'twentyeight'
      }
    });
  });
});
