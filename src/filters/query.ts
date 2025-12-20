
export type Target = 'node' | 'edge' | 'both'
export type Op = '=' | '!=' | '~' | '!~' | '>' | '>=' | '<' | '<=' | 'exists'

export type Clause = {
  target: Target
  path: string
  op: Op
  value?: string | number | boolean | null
  raw: string
}

export type ParsedQuery = {
  clauses: Clause[]
  errors: string[]
}

function isQuoted(s: string) {
  return (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))
}

function unquote(s: string) {
  if (isQuoted(s)) return s.slice(1, -1)
  return s
}

function coerceValue(v: string): string | number | boolean | null {
  const s = unquote(v)
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === 'true'
  if (/^null$/i.test(s)) return null
  // number?
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  return s
}

function tokenize(input: string): string[] {
  const out: string[] = []
  let cur = ''
  let quote: '"' | "'" | null = null

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      cur += ch
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch as any
      cur += ch
      continue
    }
    if (/\s/.test(ch)) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const OPS = ['>=', '<=', '!=', '!~', '=', '~', '>', '<'] as const

export function parseQuery(input: string): ParsedQuery {
  const clauses: Clause[] = []
  const errors: string[] = []
  const tokens = tokenize((input ?? '').trim())

  for (const tok of tokens) {
    if (!tok) continue

    let target: Target = 'both'
    let rest = tok

    if (tok.startsWith('n.')) {
      target = 'node'
      rest = tok.slice(2)
    } else if (tok.startsWith('e.')) {
      target = 'edge'
      rest = tok.slice(2)
    }

    // existence: "path" or "path?"
    if (rest.endsWith('?')) {
      clauses.push({ target, path: rest.slice(0, -1), op: 'exists', raw: tok })
      continue
    }

    let opFound: string | null = null
    let idx = -1
    for (const op of OPS) {
      const j = rest.indexOf(op)
      if (j > -1) {
        opFound = op
        idx = j
        break
      }
    }

    if (!opFound) {
      // bare path => exists
      clauses.push({ target, path: rest, op: 'exists', raw: tok })
      continue
    }

    const path = rest.slice(0, idx).trim()
    const valRaw = rest.slice(idx + opFound.length).trim()
    if (!path) {
      errors.push(`Bad clause "${tok}": missing path`)
      continue
    }
    if (!valRaw) {
      errors.push(`Bad clause "${tok}": missing value`)
      continue
    }

    clauses.push({
      target,
      path,
      op: opFound as any,
      value: coerceValue(valRaw),
      raw: tok,
    })
  }

  return { clauses, errors }
}

export function getPath(obj: any, path: string): any {
  const parts = path.split('.').filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function asString(v: any) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(String).join(',')
  return String(v)
}

export function evalClause(obj: any, clause: Clause): boolean {
  const v = getPath(obj, clause.path)

  switch (clause.op) {
    case 'exists':
      return v !== undefined && v !== null && (typeof v !== 'string' || v.length > 0)
    case '=':
      if (Array.isArray(v)) return v.map(asString).includes(asString(clause.value))
      return asString(v) === asString(clause.value)
    case '!=':
      if (Array.isArray(v)) return !v.map(asString).includes(asString(clause.value))
      return asString(v) !== asString(clause.value)
    case '~': {
      const needle = asString(clause.value).toLowerCase()
      if (Array.isArray(v)) return v.some((x) => asString(x).toLowerCase().includes(needle))
      return asString(v).toLowerCase().includes(needle)
    }
    case '!~': {
      const needle = asString(clause.value).toLowerCase()
      if (Array.isArray(v)) return !v.some((x) => asString(x).toLowerCase().includes(needle))
      return !asString(v).toLowerCase().includes(needle)
    }
    case '>':
    case '>=':
    case '<':
    case '<=': {
      const a = typeof v === 'number' ? v : Number(v)
      const b = typeof clause.value === 'number' ? clause.value : Number(clause.value)
      if (Number.isNaN(a) || Number.isNaN(b)) return false
      if (clause.op === '>') return a > b
      if (clause.op === '>=') return a >= b
      if (clause.op === '<') return a < b
      return a <= b
    }
    default:
      return true
  }
}


export function isNumericOp(op: Op) {
  return op === '>' || op === '>=' || op === '<' || op === '<='
}
