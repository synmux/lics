#!/usr/bin/env bun
/**
 * Notion database migration for lics.
 *
 * Updates all licence records:
 *   1. Normalises labels (proper casing, remove hyphens)
 *   2. Sets Apps multi-select field
 *
 * Requires NOTION_API_KEY env var (ntn_... format).
 * Uses the data source ID hardcoded from the database schema.
 *
 * Usage:
 *   bun scripts/migrate-notion.ts --dry-run           # Preview all changes
 *   bun scripts/migrate-notion.ts                     # Apply changes
 *   bun scripts/migrate-notion.ts --dry-run --verbose # Preview with skipped records
 */

import { Client } from '@notionhq/client'

// ─── Configuration ───────────────────────────────────────────────────────────

const NOTION_API_KEY = process.env.NOTION_API_KEY
// Data source ID from the database schema (collection://...)
const DATA_SOURCE_ID = '0de7018e-f2dd-4f08-8dfe-04f2ca73238a'

if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY not set. Export it or add to .env.')
  process.exit(1)
}

const notion = new Client({ auth: NOTION_API_KEY })
const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

// Spacing between API requests (~3 req/s limit)
const REQUEST_SPACING_MS = 350

// ─── Skip rules ──────────────────────────────────────────────────────────────

function shouldSkipRecord(pageId: string, title: string): boolean {
  // Microsoft records
  if (pageId.startsWith('17fb')) return true
  // Special container pages
  if (title.startsWith('_')) return true
  // Known Microsoft/SPLA records
  if (title === 'spla-number') return true
  if (title === 'License - 41561234') return true
  if (title === 'Microsoft Keys: Academies 2013') return true
  return false
}

// ─── Label overrides ─────────────────────────────────────────────────────────
// Exact-match overrides (case-sensitive) for mixed-case originals that the
// heuristic can't handle.

const EXACT_LABEL_FIXES: Record<string, string> = {
  SynthMasterOneLicenceKey: 'SynthMaster One',
  SynthMasterLicenceKey: 'SynthMaster 2',
  'MIK: Captain Plugins': 'Captain Plugins'
}

// Lowercase-match overrides: currentLabel.toLowerCase() → proper label.
// Only needed when the heuristic (hyphen split + title case) would give
// the wrong result.
const LOWERCASE_LABEL_FIXES: Record<string, string> = {
  // Specific label cleanups from the plan
  soundsource: 'SoundSource (v3)',
  arq: 'Arq (All Keys)',
  'air-blackfriday': 'AIR (Black Friday)',

  // CamelCase / non-obvious product names
  devknife: 'DevKnife',
  'disktools-pro': 'DiskTools Pro',
  gpgtools: 'GPGTools',
  'lensflare-studio': 'LensFlare Studio',
  instachord: 'InstaChord',
  castbridge: 'CastBridge',
  chronosync: 'ChronoSync',
  cssedit: 'CSSEdit',
  expandrive: 'ExpanDrive',
  'hy-plugins': 'HY-Plugins',
  irehearse: 'iRehearse',
  istopmotion: 'iStopMotion',
  iphoto2tumblr: 'iPhoto2Tumblr',
  izotope: 'iZotope',
  macbundler: 'MacBundler',
  'macgourmet-deluxe': 'MacGourmet Deluxe',
  macgpt: 'MacGPT',
  macjournal: 'MacJournal',
  macupdater: 'MacUpdater',
  marsedit: 'MarsEdit',
  meshcore: 'MeshCore',
  moneybag: 'MoneyBag',
  onecast: 'OneCast',
  phpstorm: 'PhpStorm',
  pycharm: 'PyCharm',
  quakenotch: 'QuakeNotch',
  rapidweaver: 'RapidWeaver',
  realvnc: 'RealVNC',
  ripit: 'RipIt',
  runjs: 'RunJS',
  'shaperbox-2': 'ShaperBox 2',
  shovebox: 'ShoveBox',
  smartsvn: 'SmartSVN',
  songkong: 'SongKong',
  'spectralayers-pro': 'SpectraLayers Pro',
  strongsync: 'StrongSync',
  switchresx: 'SwitchResX',
  syncmate: 'SyncMate',
  teracopy: 'TeraCopy',
  textmate: 'TextMate',
  textsoap: 'TextSoap',
  tuneup: 'TuneUp',
  vidiary: 'ViDiary',
  webstorm: 'WebStorm',
  writeroom: 'WriteRoom',
  xtwin: 'XTwin',
  firetask: 'FireTask',
  lightpaper: 'LightPaper',
  coverscout: 'CoverScout',
  codekit: 'CodeKit',
  'mamp-pro': 'MAMP Pro',
  mbam: 'MBAM',
  rubymine: 'RubyMine',
  'digi-me': 'Digi.me',
  'newznab+': 'Newznab+',
  'mixed-in-key': 'Mixed In Key',
  'pdf-signer': 'PDF Signer',
  'snapz-pro-x': 'Snapz Pro X'
}

// Labels where the Apps field should differ from the label.
// Default rule: Apps = [label].
const APPS_OVERRIDES: Record<string, string[]> = {
  'SoundSource (v3)': ['SoundSource'],
  'Luminar 3': ['Luminar'],
  'Luminar 4': ['Luminar'],
  'AIR (Black Friday)': ['AIR'],
  'Airfoil 5': ['Airfoil'],
  'Arq (All Keys)': ['Arq'],
  'Bartender 3': ['Bartender'],
  'Bartender 4': ['Bartender'],
  'Backup Loupe 3': ['Backup Loupe'],
  'SoundSource 5': ['SoundSource'],
  'Vira Theme for VS Code': ['Vira Theme'],
  'Vira Theme for JetBrains': ['Vira Theme']
}

// ─── Heuristic normalisation ─────────────────────────────────────────────────

/**
 * Title-case a single word: "bass" → "Bass", "010" → "010".
 */
function titleCaseWord(word: string): string {
  if (word.length === 0) return word
  // Don't capitalise purely numeric tokens
  if (/^\d+$/.test(word)) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/**
 * Heuristic label normalisation for slug-style lowercase names.
 *   "bass-master" → "Bass Master"
 *   "deep"        → "Deep"
 *   "Already Good" → "Already Good" (no change)
 */
function normaliseLabelHeuristic(label: string): string {
  // Hyphenated all-lowercase → split, title-case, rejoin with spaces
  if (label.includes('-') && label === label.toLowerCase()) {
    return label.split('-').map(titleCaseWord).join(' ')
  }
  // Entirely lowercase, no hyphens → capitalise first letter
  if (label === label.toLowerCase() && label.length > 1) {
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return label
}

/**
 * Resolve the target label for a record.
 * Priority: exact override → lowercase override → heuristic → no change.
 */
function resolveLabel(currentLabel: string): string {
  if (EXACT_LABEL_FIXES[currentLabel] !== undefined) {
    return EXACT_LABEL_FIXES[currentLabel]
  }
  const lowerKey = currentLabel.toLowerCase()
  if (LOWERCASE_LABEL_FIXES[lowerKey] !== undefined) {
    return LOWERCASE_LABEL_FIXES[lowerKey]
  }
  return normaliseLabelHeuristic(currentLabel)
}

/**
 * Resolve the target Apps for a label.
 * Priority: explicit override → default [label].
 */
function resolveApps(label: string): string[] {
  if (APPS_OVERRIDES[label] !== undefined) {
    return APPS_OVERRIDES[label]
  }
  return [label]
}

// ─── Notion helpers ──────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, description: string, maxRetries = 6): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const notionError = error as { status?: number; message?: string }
      if (notionError?.status === 429 && attempt < maxRetries) {
        const waitMs = Math.min(1000 * 2 ** attempt, 30_000)
        console.log(`  Rate limited (${description}), retrying in ${waitMs / 1000}s...`)
        await sleep(waitMs)
        continue
      }
      throw error
    }
  }
  throw new Error(`Max retries exceeded for: ${description}`)
}

/** Extract the title from a Notion page result. */
function getTitle(properties: Record<string, unknown>): string {
  for (const propName of ['Label', 'App']) {
    const prop = properties[propName] as { type: string; title: Array<{ plain_text: string }> } | undefined
    if (prop?.type === 'title' && prop.title?.length > 0) {
      return prop.title.map((segment) => segment.plain_text).join('')
    }
  }
  return ''
}

/** Detect which property name holds the title. */
function getTitlePropertyName(properties: Record<string, unknown>): string {
  for (const propName of ['Label', 'App']) {
    const prop = properties[propName] as { type?: string } | undefined
    if (prop?.type === 'title') return propName
  }
  return 'Label'
}

/** Extract Apps multi-select values from page properties. */
function getApps(properties: Record<string, unknown>): string[] {
  const prop = properties['Apps'] as { type: string; multi_select: Array<{ name: string }> } | undefined
  if (prop?.type === 'multi_select') {
    return prop.multi_select.map((option) => option.name)
  }
  return []
}

// ─── Core logic ──────────────────────────────────────────────────────────────

interface PageRecord {
  id: string
  properties: Record<string, unknown>
}

/** Paginate through all records in the data source. */
async function getAllPages(): Promise<PageRecord[]> {
  const pages: PageRecord[] = []
  let cursor: string | undefined

  do {
    const response = await withRetry(
      () =>
        notion.dataSources.query({
          data_source_id: DATA_SOURCE_ID,
          start_cursor: cursor,
          page_size: 100
        } as never),
      'data source query'
    )

    for (const result of (response as { results: Array<{ id: string; properties?: Record<string, unknown> }> })
      .results) {
      if (result.properties) {
        pages.push({ id: result.id, properties: result.properties })
      }
    }

    const paginatedResponse = response as { has_more: boolean; next_cursor: string | null }
    cursor = paginatedResponse.has_more ? (paginatedResponse.next_cursor ?? undefined) : undefined
    if (paginatedResponse.has_more) await sleep(REQUEST_SPACING_MS)
  } while (cursor)

  return pages
}

interface UpdateStats {
  total: number
  skipped: number
  alreadyCorrect: number
  updated: number
  errors: number
}

async function main(): Promise<void> {
  console.log(`\nNotion Database Migration${DRY_RUN ? ' (DRY RUN)' : ''}`)
  console.log(`Data Source: ${DATA_SOURCE_ID}\n`)

  // Step 1: Fetch all pages
  console.log('Fetching all database records...')
  const pages = await getAllPages()
  console.log(`Found ${pages.length} records\n`)

  const stats: UpdateStats = {
    total: pages.length,
    skipped: 0,
    alreadyCorrect: 0,
    updated: 0,
    errors: 0
  }

  for (const page of pages) {
    const { id: pageId, properties } = page
    const currentLabel = getTitle(properties)
    const currentApps = getApps(properties)
    const titlePropName = getTitlePropertyName(properties)

    // Skip check
    if (shouldSkipRecord(pageId, currentLabel)) {
      stats.skipped++
      if (VERBOSE) console.log(`  SKIP  ${currentLabel} [${pageId}]`)
      continue
    }

    // Resolve target values
    const targetLabel = resolveLabel(currentLabel)
    const targetApps = resolveApps(targetLabel)

    // Compare with current state
    const labelChanged = targetLabel !== currentLabel
    const currentAppsSorted = [...currentApps].sort()
    const targetAppsSorted = [...targetApps].sort()
    const appsChanged = JSON.stringify(currentAppsSorted) !== JSON.stringify(targetAppsSorted)

    if (!labelChanged && !appsChanged) {
      stats.alreadyCorrect++
      if (VERBOSE) console.log(`  OK    ${currentLabel} [${pageId}]`)
      continue
    }

    // Build update payload
    const updateProperties: Record<string, unknown> = {}
    const changes: string[] = []

    if (labelChanged) {
      updateProperties[titlePropName] = {
        title: [{ text: { content: targetLabel } }]
      }
      changes.push(`Label: "${currentLabel}" -> "${targetLabel}"`)
    }

    if (appsChanged) {
      updateProperties['Apps'] = {
        multi_select: targetApps.map((name) => ({ name }))
      }
      changes.push(`Apps: [${currentApps.join(', ') || 'empty'}] -> [${targetApps.join(', ')}]`)
    }

    if (DRY_RUN) {
      console.log(`  WOULD ${pageId}: ${changes.join('; ')}`)
      stats.updated++
    } else {
      try {
        await withRetry(
          () =>
            notion.pages.update({
              page_id: pageId,
              properties: updateProperties
            } as never),
          currentLabel
        )
        console.log(`  OK    ${currentLabel}: ${changes.join('; ')}`)
        stats.updated++
        await sleep(REQUEST_SPACING_MS)
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(`  FAIL  ${currentLabel} [${pageId}]: ${errorMessage}`)
        stats.errors++
      }
    }
  }

  // Summary
  console.log('\n--- Summary ---')
  console.log(`  Total records:    ${stats.total}`)
  console.log(`  Skipped:          ${stats.skipped}`)
  console.log(`  Already correct:  ${stats.alreadyCorrect}`)
  console.log(`  Updated:          ${stats.updated}`)
  console.log(`  Errors:           ${stats.errors}`)

  if (DRY_RUN) {
    console.log('\nDry run complete. Run without --dry-run to apply changes.')
  } else if (stats.errors > 0) {
    console.log('\nSome updates failed. Re-run to retry failed records.')
  } else {
    console.log('\nAll records processed successfully.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
