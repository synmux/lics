import { homedir } from 'node:os'
import { join } from 'node:path'
import Conf from 'conf'

/** Typed configuration schema for lics */
export interface LicsConfig {
  /** Notion database ID */
  databaseId: string
  /** Notion database display name */
  databaseName: string
  /** Directory for licence file output */
  outputPath: string
}

/** Returns the platform-appropriate config directory for lics */
export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(appData, 'lics')
  }

  const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config')
  return join(xdgConfig, 'lics')
}

/** Returns the full path to the config file */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json')
}

/** JSON Schema for the config fields */
const schema = {
  databaseId: {
    type: 'string' as const,
    default: ''
  },
  databaseName: {
    type: 'string' as const,
    default: 'Licences'
  },
  outputPath: {
    type: 'string' as const,
    default: '~/Downloads'
  }
}

/** Creates a Conf store instance pointed at the lics config directory */
export function createStore(): Conf<LicsConfig> {
  return new Conf<LicsConfig>({
    cwd: getConfigDir(),
    schema
  })
}

/**
 * Loads configuration, detecting first-run and applying env var overrides.
 * Environment variables take precedence over config file values.
 */
export async function loadConfig(): Promise<{ config: LicsConfig; isFirstRun: boolean }> {
  const configPath = getConfigPath()
  const isFirstRun = !(await Bun.file(configPath).exists())

  const store = createStore()

  const config: LicsConfig = {
    databaseId: process.env.LICS_DATABASE_ID ?? store.get('databaseId'),
    databaseName: process.env.LICS_DATABASE_NAME ?? store.get('databaseName'),
    outputPath: store.get('outputPath')
  }

  return { config, isFirstRun }
}

/** Opens the config file in the user's preferred editor */
export async function openConfigInEditor(): Promise<void> {
  const configPath = getConfigPath()

  // Ensure the config file exists before opening
  if (!(await Bun.file(configPath).exists())) {
    createStore()
  }

  const editor =
    process.platform === 'win32'
      ? (process.env.EDITOR ?? process.env.VISUAL ?? 'notepad')
      : (process.env.EDITOR ?? process.env.VISUAL ?? 'vi')

  const proc = Bun.spawn([editor, configPath], {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  })

  await proc.exited
}
