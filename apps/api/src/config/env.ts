interface EnvConfig {
  port: number;
  jwtSecret: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

export function loadEnvConfig(): EnvConfig {
  const rawPort = process.env.PORT ?? '3001';
  const rawJwtSecret = process.env.JWT_SECRET ?? 'dev-local-jwt-secret-change-in-prod';
  const rawDbHost = process.env.DB_HOST ?? 'localhost';
  const rawDbPort = process.env.DB_PORT ?? '5434';
  const rawDbName = process.env.DB_NAME ?? 'twentyeight';
  const rawDbUser = process.env.DB_USER ?? 'twentyeight';
  const rawDbPassword = process.env.DB_PASSWORD ?? 'twentyeight_dev_password';
  const parsedPort = Number(rawPort);
  const parsedDbPort = Number(rawDbPort);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    throw new Error('Invalid PORT environment variable. Expected positive integer.');
  }

  if (rawJwtSecret.trim().length < 16) {
    throw new Error('Invalid JWT_SECRET. Expected at least 16 characters.');
  }

  if (!rawDbHost.trim()) {
    throw new Error('Invalid DB_HOST. Expected non-empty value.');
  }

  if (!Number.isInteger(parsedDbPort) || parsedDbPort <= 0) {
    throw new Error('Invalid DB_PORT environment variable. Expected positive integer.');
  }

  if (!rawDbName.trim()) {
    throw new Error('Invalid DB_NAME. Expected non-empty value.');
  }

  if (!rawDbUser.trim()) {
    throw new Error('Invalid DB_USER. Expected non-empty value.');
  }

  if (!rawDbPassword.trim()) {
    throw new Error('Invalid DB_PASSWORD. Expected non-empty value.');
  }

  return {
    port: parsedPort,
    jwtSecret: rawJwtSecret,
    dbHost: rawDbHost,
    dbPort: parsedDbPort,
    dbName: rawDbName,
    dbUser: rawDbUser,
    dbPassword: rawDbPassword
  };
}
