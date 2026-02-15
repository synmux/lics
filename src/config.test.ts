import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore, getConfigDir, getConfigPath, loadConfig } from './config.ts'

let tempDir: string
let originalXdg: string | undefined
let originalDbId: string | undefined
let originalDbName: string | undefined

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'lics-test-'))
  originalXdg = process.env.XDG_CONFIG_HOME
  originalDbId = process.env.LICS_DATABASE_ID
  originalDbName = process.env.LICS_DATABASE_NAME

  // Point config to temp directory
  process.env.XDG_CONFIG_HOME = tempDir

  // Clear env overrides so they don't interfere with tests
  delete process.env.LICS_DATABASE_ID
  delete process.env.LICS_DATABASE_NAME
})

afterEach(async () => {
  // Restore original env
  if (originalXdg !== undefined) {
    process.env.XDG_CONFIG_HOME = originalXdg
  } else {
    delete process.env.XDG_CONFIG_HOME
  }

  if (originalDbId !== undefined) {
    process.env.LICS_DATABASE_ID = originalDbId
  } else {
    delete process.env.LICS_DATABASE_ID
  }

  if (originalDbName !== undefined) {
    process.env.LICS_DATABASE_NAME = originalDbName
  } else {
    delete process.env.LICS_DATABASE_NAME
  }

  await rm(tempDir, { recursive: true, force: true })
})

describe('getConfigDir', () => {
  test('respects $XDG_CONFIG_HOME on non-Windows', () => {
    if (process.platform === 'win32') return
    const dir = getConfigDir()
    expect(dir).toBe(join(tempDir, 'lics'))
  })

  test('falls back to ~/.config/lics when XDG is unset', () => {
    if (process.platform === 'win32') return
    delete process.env.XDG_CONFIG_HOME
    const dir = getConfigDir()
    const { homedir } = require('node:os')
    expect(dir).toBe(join(homedir(), '.config', 'lics'))
  })
})

describe('getConfigPath', () => {
  test('returns config.json inside config dir', () => {
    const path = getConfigPath()
    expect(path).toEndWith('/lics/config.json')
  })
})

describe('createStore', () => {
  test('creates store with correct defaults', () => {
    const store = createStore()
    expect(store.get('databaseId')).toBe('')
    expect(store.get('databaseName')).toBe('Licences')
    expect(store.get('outputPath')).toBe('~/Downloads')
  })

  test('creates config file on disk', async () => {
    createStore()
    const configPath = getConfigPath()
    const exists = await Bun.file(configPath).exists()
    expect(exists).toBe(true)
  })

  test('persists values across instances', () => {
    const store1 = createStore()
    store1.set('databaseId', 'test-id-123')

    const store2 = createStore()
    expect(store2.get('databaseId')).toBe('test-id-123')
  })
})

describe('loadConfig', () => {
  test('detects first run when no config file exists', async () => {
    const { isFirstRun } = await loadConfig()
    expect(isFirstRun).toBe(true)
  })

  test('detects subsequent runs after config exists', async () => {
    // First run creates the file
    await loadConfig()

    // Second run should not be first run
    const { isFirstRun } = await loadConfig()
    expect(isFirstRun).toBe(false)
  })

  test('returns correct default values', async () => {
    const { config } = await loadConfig()
    expect(config.databaseId).toBe('')
    expect(config.databaseName).toBe('Licences')
    expect(config.outputPath).toBe('~/Downloads')
  })

  test('env vars override config values', async () => {
    // First, create a config with some values
    const store = createStore()
    store.set('databaseId', 'config-id')
    store.set('databaseName', 'Config Name')

    // Set env vars
    process.env.LICS_DATABASE_ID = 'env-id'
    process.env.LICS_DATABASE_NAME = 'Env Name'

    const { config } = await loadConfig()
    expect(config.databaseId).toBe('env-id')
    expect(config.databaseName).toBe('Env Name')
  })

  test('uses config values when env vars are unset', async () => {
    const store = createStore()
    store.set('databaseId', 'my-database-id')
    store.set('databaseName', 'My Licences')

    const { config } = await loadConfig()
    expect(config.databaseId).toBe('my-database-id')
    expect(config.databaseName).toBe('My Licences')
  })

  test('config file contains valid JSON after creation', async () => {
    await loadConfig()
    const configPath = getConfigPath()
    const content = await Bun.file(configPath).text()
    const parsed = JSON.parse(content)
    expect(parsed).toHaveProperty('databaseId')
    expect(parsed).toHaveProperty('databaseName')
    expect(parsed).toHaveProperty('outputPath')
  })
})
