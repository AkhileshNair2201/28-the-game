import { Injectable } from '@nestjs/common';
import { getDatabaseConfig } from './config/database';

@Injectable()
export class AppService {
  getHealth(): { status: 'ok'; service: string; database: { host: string; port: number; name: string } } {
    const database = getDatabaseConfig();

    return {
      status: 'ok',
      service: 'twenty-eight-api',
      database: {
        host: database.host,
        port: database.port,
        name: database.database
      }
    };
  }
}
