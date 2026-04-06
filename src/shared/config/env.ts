type AppEnv = {
  DATABASE_URL: string;
  JWT_SECRET?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

type AuthEnv = {
  JWT_SECRET: string;
};

let cachedEnv: AppEnv | null = null;
let cachedAuthEnv: AuthEnv | null = null;

function requireEnv(name: keyof AppEnv): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    DATABASE_URL: requireEnv('DATABASE_URL'),
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  return cachedEnv;
}

export function getAuthEnv(): AuthEnv {
  if (cachedAuthEnv) {
    return cachedAuthEnv;
  }

  cachedAuthEnv = {
    JWT_SECRET: requireEnv('JWT_SECRET'),
  };

  return cachedAuthEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
  cachedAuthEnv = null;
}