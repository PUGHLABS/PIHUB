import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: process.env.PORT || 3001,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  dbPath: process.env.DB_PATH || './data/pivault.db',
}
