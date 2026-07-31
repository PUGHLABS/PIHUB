import { mkdirSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs'
import { join, resolve, sep } from 'path'

// Resolves a user-supplied relative path against a base directory and
// guarantees the result cannot escape outside the base (path traversal guard).
export function resolveSafePath(base, relPath = '') {
  const normBase = resolve(base)
  const target = resolve(normBase, `.${sep}${relPath}`)
  if (target !== normBase && !target.startsWith(normBase + sep)) {
    throw new Error('Path escapes base directory')
  }
  return target
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

// A folder name must be a single path segment — no traversal, no nesting.
export function isValidName(name) {
  return typeof name === 'string' && name.length > 0 && name !== '.' && name !== '..'
    && !name.includes('/') && !name.includes('\\')
}

export function listDirectory(absPath) {
  const entries = readdirSync(absPath, { withFileTypes: true })
  const items = entries.map(entry => {
    const stat = statSync(join(absPath, entry.name))
    return {
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      size: entry.isDirectory() ? null : stat.size,
      modified: stat.mtime.toISOString(),
    }
  })
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return items
}

export function deleteEntry(absPath) {
  const stat = statSync(absPath)
  if (stat.isDirectory()) {
    rmdirSync(absPath)
  } else {
    unlinkSync(absPath)
  }
}
