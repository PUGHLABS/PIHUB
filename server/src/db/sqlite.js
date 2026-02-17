import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let db

export function getDb() {
  if (!db) {
    db = new Database(config.dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8')
    db.exec(schema)
  }
  return db
}
