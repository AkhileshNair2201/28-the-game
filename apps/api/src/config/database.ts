import { loadEnvConfig } from './env';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export function getDatabaseConfig(): DatabaseConfig {
  const env = loadEnvConfig();

  return {
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    password: env.dbPassword
  };
}

export function getDatabaseUrl(): string {
  const config = getDatabaseConfig();
  return `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
}
