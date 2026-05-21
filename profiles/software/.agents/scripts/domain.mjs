#!/usr/bin/env node
// Domain Knowledge Graph helper.
//
// Usage:
//   node .agents/scripts/domain.mjs list
//   node .agents/scripts/domain.mjs impact <node>            # e.g. Booking.totalPrice
//   node .agents/scripts/domain.mjs check-coverage <concept>
//   node .agents/scripts/domain.mjs verify <concept>          # automatic correctness verification
//   node .agents/scripts/domain.mjs audit                     # verify all concepts + summary
//
// Concept graph location: .agent-memory/concepts/*.md
// Edge format inside the EDGES block (one per line):
//   <source> → <relation> → <target> @ <optional note>
//
// Vocabulary (12 verbs, no free additions):
//   data:         written-by, read-by
//   shadow:       shadowed-by, effective-via
//   effect:       triggers, emits, side-effect
//   presentation: displayed-on, rendered-in, i18n-keys
//   structure:    derives-from, composed-of
//
// Verify status (worst → best):
//   PASS       — automatic verification passed
//   FAIL       — automatic verification failed (real error). Fix immediately.
//   WARN       — suspicious (heuristic miss possible, human review recommended)
//   SKIP       — automatic verification not possible (semantic marker — human-only)
//   KNOWN_GAP  — graph is correct, code is incomplete (⚠️ note explicitly says missing/gap)

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, basename, relative, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')
const CONCEPTS_DIR = join(REPO_ROOT, '.agent-memory', 'concepts')
// Adjust SCHEMA_FILE if your project keeps the Prisma schema elsewhere.
// If the file does not exist, schema-based verification is skipped silently.
const SCHEMA_FILE = join(REPO_ROOT, 'server', 'prisma', 'schema.prisma')

const KNOWN_RELATIONS = new Set([
  'written-by', 'read-by',
  'shadowed-by', 'effective-via',
  'triggers', 'emits', 'side-effect',
  'displayed-on', 'rendered-in', 'i18n-keys',
  'derives-from', 'composed-of',
])

// ─────────────────────────────────────────────────────────────────
// Edge parsing
// ─────────────────────────────────────────────────────────────────

const NON_CONCEPT_FILES = new Set(['README.md', 'AGENT_TEMPLATE.md'])
function listConceptFiles() {
  if (!existsSync(CONCEPTS_DIR)) return []
  return readdirSync(CONCEPTS_DIR)
    .filter((f) => f.endsWith('.md') && !NON_CONCEPT_FILES.has(f))
    .map((f) => join(CONCEPTS_DIR, f))
}

function parseEdgesFromFile(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const edgesMarkerIdx = text.indexOf('──── EDGES')
  if (edgesMarkerIdx === -1) return []
  const edgesBlock = text.slice(edgesMarkerIdx)
  const edges = []
  let lineNo = text.slice(0, edgesMarkerIdx).split('\n').length
  for (const rawLine of edgesBlock.split('\n')) {
    lineNo++
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('<!--') || line.startsWith('//')) continue
    if (!line.includes('→')) continue
    const parts = line.split('→').map((s) => s.trim())
    if (parts.length < 3) continue
    const source = parts[0]
    const relation = parts[1]
    let rest = parts.slice(2).join(' → ')
    let target = rest
    let note = null
    const atIdx = rest.indexOf(' @ ')
    if (atIdx !== -1) {
      target = rest.slice(0, atIdx).trim()
      note = rest.slice(atIdx + 3).trim()
    }
    edges.push({
      source, relation, target, note,
      file: basename(filePath),
      sourceLine: lineNo,
    })
  }
  return edges
}

function loadAllEdges() {
  const files = listConceptFiles()
  const edges = []
  for (const f of files) edges.push(...parseEdgesFromFile(f))
  return edges
}

// ─────────────────────────────────────────────────────────────────
// Address classification
// ─────────────────────────────────────────────────────────────────

/**
 * Classify an address:
 *   - { kind: 'concept-field', concept, field }       → "Booking.totalPrice"
 *   - { kind: 'file-anchor', file, line, anchor }     → "server/src/routes/admin.routes.ts:2732" or "...:summary-card"
 *   - { kind: 'tag', concept, tag }                   → "Message.[BOOKING_ADJUSTED]"
 *   - { kind: 'concept', concept }                    → "PDF" or "PDF.contract" sub-node
 *   - { kind: 'opaque' }                              → other (e.g. "POST /admin/...")
 */
function classifyAddress(addr) {
  if (!addr) return { kind: 'opaque' }
  // Multi-target ('A / B / C' or 'A, B, C') — INVALID, must be split into separate edges
  if (/\s+\/\s+/.test(addr) && /^[A-Z]/.test(addr)) {
    return { kind: 'invalid-multi', raw: addr, hint: 'slash-separated multi-target — split into separate edges' }
  }
  // HTTP endpoint expression: "POST /admin/...", "GET /api/...", "PATCH /...", "DELETE /..."
  const epMatch = addr.match(/^(GET|POST|PATCH|PUT|DELETE)\s+(\/.+)$/)
  if (epMatch) return { kind: 'endpoint', method: epMatch[1], path: epMatch[2] }
  // Pattern.[TAG] (e.g. Message.[BOOKING_ADJUSTED])
  const tagMatch = addr.match(/^([A-Z][A-Za-z]*)\.\[([A-Z_]+)\]$/)
  if (tagMatch) return { kind: 'tag', concept: tagMatch[1], tag: tagMatch[2] }
  // Prisma action or event past-participle: Model.create, Model.upsert, Model.created, Model.deleted, ...
  const actionMatch = addr.match(/^([A-Z][A-Za-z]*)\.(create|createMany|update|updateMany|delete|deleteMany|upsert|findFirst|findMany|findUnique|count|aggregate|created|updated|deleted|saved|fetched|loaded)$/)
  if (actionMatch) return { kind: 'prisma-action', model: actionMatch[1], action: actionMatch[2] }
  // wildcard path (locales etc.) → wildcard-path
  if (addr.includes('*') || /\{[^{}]+\}/.test(addr)) {
    return { kind: 'wildcard-path', raw: addr }
  }
  // file path (with / or known top-level dir prefix) with optional :line or :anchor
  if (/[\\/]/.test(addr) || addr.startsWith('apps/') || addr.startsWith('server/') || addr.startsWith('client/')) {
    const m = addr.match(/^([^:]+?)(?::(.+))?$/)
    if (m) {
      const file = m[1].trim()
      const tail = m[2]?.trim() ?? null
      const line = tail && /^\d+$/.test(tail) ? Number(tail) : null
      const anchor = tail && line === null ? tail : null
      return { kind: 'file-anchor', file, line, anchor }
    }
  }
  // Concept.field — letters/digits/underscore
  const cf = addr.match(/^([A-Z][A-Za-z]*)\.([a-zA-Z][a-zA-Z0-9_]*)$/)
  if (cf) return { kind: 'concept-field', concept: cf[1], field: cf[2] }
  // Concept.UPPER_VALUE — enum value or sub-node (e.g. Notification.NEW_MESSAGE, Push.BOOKING_ADJUSTED)
  const enumVal = addr.match(/^([A-Z][A-Za-z]*)\.([A-Z][A-Z0-9_]*)$/)
  if (enumVal) return { kind: 'enum-or-subnode', concept: enumVal[1], value: enumVal[2] }
  // Concept (alone) or composite ConceptA.subB.deeper allowed
  const onlyConcept = addr.match(/^([A-Z][A-Za-z]*)(\.[A-Za-z][A-Za-z0-9_.]*)?$/)
  if (onlyConcept) return { kind: 'concept', concept: onlyConcept[1], path: onlyConcept[2]?.slice(1) ?? null }
  // i18n key path (lowercase start, dot/wildcard included) — e.g. guest_chat.booking_adjusted_*
  if (/^[a-z][a-z0-9_]*(\.[a-z0-9_*]+)+$/.test(addr) || /^[a-z][a-z0-9_]+_[*a-z]+$/.test(addr)) {
    return { kind: 'i18n-key', path: addr }
  }
  return { kind: 'opaque', raw: addr }
}

// ─────────────────────────────────────────────────────────────────
// schema.prisma parsing (per-model field list)
// ─────────────────────────────────────────────────────────────────

let _schemaCache = null
function loadSchemaModels() {
  if (_schemaCache) return _schemaCache
  if (!existsSync(SCHEMA_FILE)) return (_schemaCache = {})
  const text = readFileSync(SCHEMA_FILE, 'utf8')
  const models = {}
  const modelRe = /^(model|enum)\s+(\w+)\s*\{([\s\S]*?)\n\}/gm
  let m
  while ((m = modelRe.exec(text))) {
    const kind = m[1]
    const name = m[2]
    const body = m[3]
    if (kind === 'model') {
      const fields = []
      for (const line of body.split('\n')) {
        const t = line.trim()
        if (!t || t.startsWith('//') || t.startsWith('@@')) continue
        const fm = t.match(/^(\w+)\s+/)
        if (fm) fields.push(fm[1])
      }
      models[name] = { kind: 'model', fields: new Set(fields) }
    } else {
      const values = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'))
      models[name] = { kind: 'enum', values: new Set(values) }
    }
  }
  return (_schemaCache = models)
}

// ─────────────────────────────────────────────────────────────────
// Verification helpers
// ─────────────────────────────────────────────────────────────────

function resolveRepoFile(relPath) {
  // File paths inside concept graphs are usually repo-relative.
  // server/src/... apps/... client/... etc.
  if (isAbsolute(relPath)) return relPath
  return join(REPO_ROOT, relPath)
}

function readFileLines(filePath) {
  return readFileSync(filePath, 'utf8').split('\n')
}

/**
 * read-by verification — find a prisma select block near target file:line,
 * verify the source field is included.
 * Strict check applies only when the note hints at "explicit select" / "select" / ⚠️.
 */
function verifyReadBySelect(edge, sourceField, file, line) {
  const abs = resolveRepoFile(file)
  if (!existsSync(abs)) return { status: 'FAIL', msg: `file not found: ${file}` }
  const lines = readFileLines(abs)
  if (line == null) return { status: 'SKIP', msg: 'no line marker' }
  if (line < 1 || line > lines.length) return { status: 'FAIL', msg: `line ${line} > file length ${lines.length}` }
  // Search a window from -5 to +60 lines around the marker for a select/include block.
  // For explicit-select edges, the goal is: does the whitelist contain sourceField?
  const start = Math.max(0, line - 6)
  const end = Math.min(lines.length, line + 60)
  const window = lines.slice(start, end).join('\n')
  // Safest heuristic: if `select:` / `include:` appears within the window, look for sourceField inside.
  const hasSelectNearby = /select\s*:/.test(window) || /include\s*:/.test(window)
  if (!hasSelectNearby) {
    return { status: 'WARN', msg: `no select/include block near line ${line} (heuristic miss)` }
  }
  // Match `field: true` or `field: { ... }` inside select/include
  const fieldRe = new RegExp(`(^|[\\s{,])${escapeRegExp(sourceField)}\\s*:\\s*(true|\\{)`, 'm')
  if (fieldRe.test(window)) {
    return { status: 'PASS', msg: `field '${sourceField}' present in select/include near line ${line}` }
  }
  // where input is also a valid form of read-by (e.g. findUnique({ where: { token } }))
  const whereRe = new RegExp(`where\\s*:\\s*\\{[^}]*\\b${escapeRegExp(sourceField)}\\b`, 'ms')
  if (whereRe.test(window)) {
    return { status: 'PASS', msg: `field '${sourceField}' used as where input near line ${line}` }
  }
  // include-only blocks (no explicit select) auto-return all columns
  if (/include\s*:/.test(window) && !/select\s*:/.test(window)) {
    return { status: 'PASS', msg: `include block at line ${line} (auto-returns all columns)` }
  }
  return { status: 'FAIL', msg: `field '${sourceField}' missing from select/where near line ${line}` }
}

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/**
 * Pattern.[TAG] → rendered-in → file:line
 * verify the file actually contains [TAG].
 */
function verifyRenderedIn(tag, file) {
  const abs = resolveRepoFile(file)
  if (!existsSync(abs)) return { status: 'FAIL', msg: `file not found: ${file}` }
  const text = readFileSync(abs, 'utf8')
  if (text.includes(`[${tag}]`)) return { status: 'PASS', msg: `[${tag}] present` }
  return { status: 'FAIL', msg: `[${tag}] not found in file` }
}

/**
 * i18n-keys: target is a locale file/dir. Verify the source key actually exists.
 */
function verifyI18nKeys(keyPath, target) {
  // target shapes: "client/src/locales/*/common.json", "apps/<x>/src/locales/{en,ko}.json"
  const candidates = expandLocaleTargets(target)
  if (candidates.length === 0) return { status: 'WARN', msg: `cannot expand target: ${target}` }
  const missing = []
  let checked = 0
  for (const f of candidates) {
    if (!existsSync(f)) continue
    checked++
    try {
      const obj = JSON.parse(readFileSync(f, 'utf8'))
      if (!hasKeyPath(obj, keyPath)) missing.push(basename(dirname(f)) + '/' + basename(f))
    } catch { missing.push(basename(f) + ' (parse error)') }
  }
  if (checked === 0) return { status: 'WARN', msg: `no locale files matched: ${target}` }
  if (missing.length === 0) return { status: 'PASS', msg: `key '${keyPath}' present in ${checked} locale files` }
  return { status: 'FAIL', msg: `key '${keyPath}' missing in: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}` }
}

function hasKeyPath(obj, path) {
  // wildcard key (e.g. booking_adjusted_*) — prefix match
  if (path.endsWith('*')) {
    const prefix = path.slice(0, -1)
    return findAnyKeyMatching(obj, prefix)
  }
  const parts = path.split('.')
  let cur = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else return false
  }
  return cur !== undefined
}

function findAnyKeyMatching(obj, prefix) {
  const parts = prefix.split('.')
  const last = parts.pop()
  let cur = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) cur = cur[p]
    else return false
  }
  if (!cur || typeof cur !== 'object') return false
  return Object.keys(cur).some((k) => k.startsWith(last))
}

function expandLocaleTargets(target) {
  // 1) "client/src/locales/*/common.json" — */ wildcard
  // 2) "apps/<x>/src/locales/{en,ko}.json" — brace expansion
  // 3) plain path
  const out = []
  const starMatch = target.match(/^(.+?)\/\*\/([^*{}]+)$/)
  if (starMatch) {
    const dir = resolveRepoFile(starMatch[1])
    const tail = starMatch[2]
    if (existsSync(dir)) {
      for (const sub of readdirSync(dir)) {
        const full = join(dir, sub, tail)
        if (existsSync(full)) out.push(full)
      }
    }
    return out
  }
  const braceMatch = target.match(/^(.+?)\{([^{}]+)\}(.*)$/)
  if (braceMatch) {
    const [, pre, alts, post] = braceMatch
    for (const alt of alts.split(',')) {
      out.push(resolveRepoFile(`${pre}${alt.trim()}${post}`))
    }
    return out
  }
  out.push(resolveRepoFile(target))
  return out
}

/**
 * Concept.field verification — confirm the concept maps to a schema model and the field is a real column.
 * Note: concept names may differ from schema models (e.g. `Notifications` may compose `Notification` + `PushToken`,
 * `PDF` may have no schema model at all).
 */
function verifyConceptField(concept, field) {
  const models = loadSchemaModels()
  // 1) exact match — model field
  if (models[concept]?.kind === 'model') {
    if (models[concept].fields.has(field)) return { status: 'PASS', msg: `${concept}.${field} exists in schema model` }
    // model exists but field missing → could be an enum value with the same name
  }
  // 2) enum value match — concept name === enum name
  if (models[concept]?.kind === 'enum') {
    return models[concept].values.has(field)
      ? { status: 'PASS', msg: `${concept}.${field} is enum value` }
      : { status: 'FAIL', msg: `${concept}.${field} NOT in enum ${concept}` }
  }
  // 3) common enum naming heuristic — `${concept}Type`, `${concept}Status`, etc.
  const enumGuesses = [`${concept}Type`, `${concept}Status`, `${concept}_TYPE`]
  for (const eg of enumGuesses) {
    if (models[eg]?.kind === 'enum' && models[eg].values.has(field)) {
      return { status: 'PASS', msg: `${concept}.${field} is value of enum ${eg}` }
    }
  }
  if (models[concept]?.kind === 'model') {
    return { status: 'FAIL', msg: `${concept}.${field} NOT in schema model ${concept}` }
  }
  // 4) sub-node pattern (e.g. Notifications.push, PDF.contract) — schema verification not possible → SKIP
  return { status: 'SKIP', msg: `no schema model named '${concept}' (sub-node or non-DB concept)` }
}

/**
 * file-anchor verification — file exists + line is sane.
 */
function verifyFileAnchor(file, line) {
  const abs = resolveRepoFile(file)
  if (!existsSync(abs)) return { status: 'FAIL', msg: `file not found: ${file}` }
  if (line == null) return { status: 'PASS', msg: `file exists (no line check)` }
  const stat = statSync(abs)
  if (!stat.isFile()) return { status: 'FAIL', msg: `not a file: ${file}` }
  const totalLines = readFileSync(abs, 'utf8').split('\n').length
  if (line < 1 || line > totalLines) return { status: 'FAIL', msg: `line ${line} out of range (file has ${totalLines} lines)` }
  return { status: 'PASS', msg: `${file}:${line} OK` }
}

// ─────────────────────────────────────────────────────────────────
// Edge verification dispatcher
// ─────────────────────────────────────────────────────────────────

function verifyEdge(edge) {
  const results = []
  const srcKind = classifyAddress(edge.source)
  const tgtKind = classifyAddress(edge.target)

  // Source verification
  if (srcKind.kind === 'invalid-multi') {
    results.push({ part: 'source', status: 'FAIL', msg: srcKind.hint + ': ' + srcKind.raw })
  } else if (srcKind.kind === 'concept-field') {
    results.push({ part: 'source', ...verifyConceptField(srcKind.concept, srcKind.field) })
  } else if (srcKind.kind === 'enum-or-subnode') {
    const r = verifyConceptField(srcKind.concept, srcKind.value)
    if (r.status === 'FAIL') results.push({ part: 'source', status: 'SKIP', msg: `'${edge.source}' likely sub-node (no schema match)` })
    else results.push({ part: 'source', ...r })
  } else if (srcKind.kind === 'file-anchor') {
    results.push({ part: 'source', ...verifyFileAnchor(srcKind.file, srcKind.line) })
  } else if (srcKind.kind === 'prisma-action') {
    // Only check that the model exists (the action itself is a prisma method, not a schema field)
    const models = loadSchemaModels()
    if (models[srcKind.model]) results.push({ part: 'source', status: 'PASS', msg: `${srcKind.model}.${srcKind.action} (model exists)` })
    else results.push({ part: 'source', status: 'WARN', msg: `model '${srcKind.model}' not in schema` })
  } else {
    results.push({ part: 'source', status: 'SKIP', msg: `address kind: ${srcKind.kind}` })
  }

  // Target verification
  if (tgtKind.kind === 'invalid-multi') {
    results.push({ part: 'target', status: 'FAIL', msg: tgtKind.hint + ': ' + tgtKind.raw })
  } else if (edge.relation === 'i18n-keys') {
    // i18n target: handle wildcard-path / file-anchor / opaque all via verifyI18nKeys
    results.push({ part: 'i18n', ...verifyI18nKeys(edge.source, edge.target) })
  } else if (tgtKind.kind === 'file-anchor') {
    results.push({ part: 'target', ...verifyFileAnchor(tgtKind.file, tgtKind.line) })
  } else if (tgtKind.kind === 'concept-field') {
    results.push({ part: 'target', ...verifyConceptField(tgtKind.concept, tgtKind.field) })
  } else if (tgtKind.kind === 'enum-or-subnode') {
    const r = verifyConceptField(tgtKind.concept, tgtKind.value)
    if (r.status === 'FAIL') results.push({ part: 'target', status: 'SKIP', msg: `'${edge.target}' likely sub-node` })
    else results.push({ part: 'target', ...r })
  } else if (tgtKind.kind === 'prisma-action') {
    const models = loadSchemaModels()
    if (models[tgtKind.model]) results.push({ part: 'target', status: 'PASS', msg: `${tgtKind.model}.${tgtKind.action} (model exists)` })
    else results.push({ part: 'target', status: 'WARN', msg: `model '${tgtKind.model}' not in schema` })
  } else if (tgtKind.kind === 'tag') {
    results.push({ part: 'target', status: 'SKIP', msg: 'tag pattern (no file)' })
  } else {
    results.push({ part: 'target', status: 'SKIP', msg: `address kind: ${tgtKind.kind}` })
  }

  // Relation-specific stronger verification
  if (edge.relation === 'read-by' && srcKind.kind === 'concept-field' && tgtKind.kind === 'file-anchor') {
    const isExplicit = edge.note?.includes('select') || edge.note?.includes('⚠️')
    if (isExplicit) {
      results.push({ part: 'select', ...verifyReadBySelect(edge, srcKind.field, tgtKind.file, tgtKind.line) })
    }
  }
  if (edge.relation === 'rendered-in' && srcKind.kind === 'tag' && tgtKind.kind === 'file-anchor') {
    results.push({ part: 'tag-grep', ...verifyRenderedIn(srcKind.tag, tgtKind.file) })
  }

  // Aggregate status: worst result wins
  const order = ['FAIL', 'WARN', 'SKIP', 'PASS']
  let worst = 'PASS'
  for (const r of results) {
    if (order.indexOf(r.status) < order.indexOf(worst)) worst = r.status
  }
  // If the ⚠️ note explicitly flags a code gap, reclassify FAIL → KNOWN_GAP
  // (graph is correct, code is incomplete)
  if (worst === 'FAIL' && edge.note) {
    const noteHint = /⚠️.*\b(missing|gap|NOT YET|not yet|TODO|deprecated)\b/i.test(edge.note)
    if (noteHint) worst = 'KNOWN_GAP'
  }
  return { status: worst, parts: results }
}

// ─────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────

function nodeMatches(edgePart, query) {
  if (edgePart === query) return true
  return edgePart.includes(query)
}

function cmdList() {
  const files = listConceptFiles()
  if (files.length === 0) { console.log('(no concept files yet)'); return }
  console.log('Concept files (' + files.length + '):')
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    const firstLine = text.split('\n').find((l) => l.startsWith('# '))?.replace(/^#\s+/, '').replace(/\s*<!--.*-->\s*$/, '').trim() ?? '(no title)'
    const edgeCount = parseEdgesFromFile(f).length
    console.log(`  ${basename(f).padEnd(20)}  ${firstLine.padEnd(20)}  ${edgeCount} edges`)
  }
}

function cmdImpact(query) {
  if (!query) { console.error('Usage: domain.mjs impact <node>'); process.exit(2) }
  const edges = loadAllEdges()
  const asSource = edges.filter((e) => nodeMatches(e.source, query))
  const asTarget = edges.filter((e) => nodeMatches(e.target, query))
  if (asSource.length === 0 && asTarget.length === 0) {
    console.log(`No edges related to '${query}'.`)
    return
  }
  console.log(query)
  const groups = new Map()
  for (const e of asSource) {
    if (!groups.has(e.relation)) groups.set(e.relation, [])
    groups.get(e.relation).push({ ...e, dir: 'out' })
  }
  for (const e of asTarget) {
    const rev = `←${e.relation}`
    if (!groups.has(rev)) groups.set(rev, [])
    groups.get(rev).push({ ...e, dir: 'in' })
  }
  const orderedKnown = ['written-by', 'read-by', 'displayed-on', 'rendered-in', 'i18n-keys', 'shadowed-by', 'effective-via', 'triggers', 'emits', 'side-effect', 'derives-from', 'composed-of']
  const printRel = (rel) => {
    const list = groups.get(rel)
    if (!list || list.length === 0) return
    console.log(`  ${rel}:`)
    for (const e of list) {
      const prefix = e.note?.startsWith('⚠️') ? '⚠️ ' : '- '
      const other = e.dir === 'out' ? e.target : e.source
      console.log(`    ${prefix}${other}${e.note ? ' (' + e.note + ')' : ''}`)
    }
  }
  for (const r of orderedKnown) printRel(r)
  for (const r of orderedKnown) printRel(`←${r}`)
}

function cmdCheckCoverage(concept) {
  if (!concept) { console.error('Usage: domain.mjs check-coverage <concept>'); process.exit(2) }
  const file = join(CONCEPTS_DIR, `${concept}.md`)
  if (!existsSync(file)) { console.error(`Concept file not found: ${file}`); process.exit(1) }
  const edges = parseEdgesFromFile(file)
  const flagged = edges.filter((e) => e.note && e.note.startsWith('⚠️'))
  console.log(`Concept: ${concept}  (total ${edges.length} edges, ⚠️ flagged ${flagged.length})`)
  if (flagged.length === 0) { console.log('  No ⚠️-marked surfaces.'); return }
  console.log('\n⚠️ Surfaces requiring manual review:')
  for (const e of flagged) {
    console.log(`  • ${e.source} → ${e.relation} → ${e.target}`)
    console.log(`    ${e.note}`)
  }
}

function cmdVerify(concept, opts = {}) {
  if (!concept) { console.error('Usage: domain.mjs verify <concept> [--quiet]'); process.exit(2) }
  const file = join(CONCEPTS_DIR, `${concept}.md`)
  if (!existsSync(file)) { console.error(`Concept file not found: ${file}`); process.exit(1) }
  const edges = parseEdgesFromFile(file)
  const summary = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0, KNOWN_GAP: 0 }
  const failures = []
  const warnings = []
  for (const e of edges) {
    const v = verifyEdge(e)
    summary[v.status]++
    if (v.status === 'FAIL') failures.push({ edge: e, ...v })
    if (v.status === 'WARN') warnings.push({ edge: e, ...v })
  }
  console.log(`Concept: ${concept}  (${edges.length} edges)`)
  console.log(`  PASS ${summary.PASS}  FAIL ${summary.FAIL}  WARN ${summary.WARN}  SKIP ${summary.SKIP}  KNOWN_GAP ${summary.KNOWN_GAP}`)
  if (failures.length > 0) {
    console.log(`\n❌ FAIL (${failures.length}):`)
    for (const f of failures) {
      console.log(`  L${f.edge.sourceLine}: ${f.edge.source} → ${f.edge.relation} → ${f.edge.target}`)
      for (const p of f.parts.filter((p) => p.status === 'FAIL')) {
        console.log(`    [${p.part}] ${p.msg}`)
      }
    }
  }
  if (warnings.length > 0 && !opts.quiet) {
    console.log(`\n⚠️  WARN (${warnings.length}):`)
    for (const w of warnings.slice(0, 10)) {
      console.log(`  L${w.edge.sourceLine}: ${w.edge.source} → ${w.edge.relation} → ${w.edge.target}`)
      for (const p of w.parts.filter((p) => p.status === 'WARN')) {
        console.log(`    [${p.part}] ${p.msg}`)
      }
    }
    if (warnings.length > 10) console.log(`  ... +${warnings.length - 10} more`)
  }
  return { failures: failures.length, warnings: warnings.length, total: edges.length }
}

function cmdAudit() {
  const files = listConceptFiles()
  if (files.length === 0) { console.log('(no concepts)'); return }
  console.log(`Auditing ${files.length} concepts...\n`)
  const total = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0, KNOWN_GAP: 0, edges: 0 }
  const conceptResults = []
  for (const f of files) {
    const concept = basename(f, '.md')
    const edges = parseEdgesFromFile(f)
    const s = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0, KNOWN_GAP: 0 }
    for (const e of edges) {
      const v = verifyEdge(e)
      s[v.status]++
    }
    total.PASS += s.PASS; total.FAIL += s.FAIL; total.WARN += s.WARN; total.SKIP += s.SKIP; total.KNOWN_GAP += s.KNOWN_GAP; total.edges += edges.length
    conceptResults.push({ concept, edges: edges.length, ...s })
  }
  console.log('| Concept       | edges | PASS | FAIL | WARN | SKIP | GAP |')
  console.log('|---------------|------:|-----:|-----:|-----:|-----:|----:|')
  for (const r of conceptResults) {
    const fail = r.FAIL > 0 ? `❌ ${r.FAIL}` : `${r.FAIL}`
    console.log(`| ${r.concept.padEnd(13)} | ${String(r.edges).padStart(5)} | ${String(r.PASS).padStart(4)} | ${String(fail).padStart(5)} | ${String(r.WARN).padStart(4)} | ${String(r.SKIP).padStart(4)} | ${String(r.KNOWN_GAP).padStart(3)} |`)
  }
  console.log(`| ${'TOTAL'.padEnd(13)} | ${String(total.edges).padStart(5)} | ${String(total.PASS).padStart(4)} | ${String(total.FAIL).padStart(5)} | ${String(total.WARN).padStart(4)} | ${String(total.SKIP).padStart(4)} | ${String(total.KNOWN_GAP).padStart(3)} |`)
  console.log('')
  console.log(`Legend: PASS = passed / FAIL = graph error (fix immediately) / WARN = heuristic suspicion / SKIP = cannot auto-verify / GAP = graph correct, code incomplete (⚠️ note marked)`)
  console.log('')
  if (total.FAIL > 0) {
    console.log(`❌ ${total.FAIL} edges FAIL — fix immediately. Per-concept detail: \`domain.mjs verify <concept>\`.`)
    process.exitCode = 1
  } else {
    console.log(`✅ FAIL 0. Auto-verified ${total.PASS}/${total.edges} (${Math.round(total.PASS/total.edges*100)}%). KNOWN_GAP ${total.KNOWN_GAP} (code gap — see ROADMAP).`)
  }
}

// ─────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────

const [, , sub, ...args] = process.argv
const opts = { quiet: args.includes('--quiet') }
const positional = args.filter((a) => !a.startsWith('--'))
switch (sub) {
  case 'list': cmdList(); break
  case 'impact': cmdImpact(positional[0]); break
  case 'check-coverage': cmdCheckCoverage(positional[0]); break
  case 'verify': cmdVerify(positional[0], opts); break
  case 'audit': cmdAudit(); break
  case undefined:
  case 'help':
  case '--help':
  case '-h':
    console.log(`Domain Knowledge Graph helper

Usage:
  node .agents/scripts/domain.mjs list
  node .agents/scripts/domain.mjs impact <node>
  node .agents/scripts/domain.mjs check-coverage <concept>
  node .agents/scripts/domain.mjs verify <concept> [--quiet]
  node .agents/scripts/domain.mjs audit

Verify status:
  PASS       passed
  FAIL       real error — fix immediately
  WARN       heuristic suspicion — human review
  SKIP       semantic marker — auto-verification not possible
  KNOWN_GAP  graph correct, code incomplete (⚠️ note explicitly marks "missing/gap/NOT YET")
`)
    break
  default:
    console.error(`Unknown subcommand: ${sub}`)
    process.exit(2)
}
