import { homedir } from 'node:os'
import { join } from 'node:path'
import type { LicenceFile } from './types.ts'

/**
 * Expand tilde (~) to the user's home directory.
 */
export function expandTilde(path: string): string {
  if (path === '~') {
    return homedir()
  }

  if (path.startsWith('~/') || path.startsWith('~\\')) {
    // Remove the leading "~" and then strip any leading path separators
    const remainder = path.slice(1)
    const relativeRemainder = remainder.replace(/^[\\/]+/, '')
    return join(homedir(), relativeRemainder)
  }
  return path
}

/**
 * Copy text to the system clipboard.
 * Uses pbcopy on macOS, xclip on Linux, clip.exe on Windows.
 * Returns true if successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = process.platform

  try {
    if (platform === 'darwin') {
      const proc = Bun.spawn(['pbcopy'], { stdin: 'pipe' })
      proc.stdin.write(text)
      proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    if (platform === 'linux') {
      const proc = Bun.spawn(['xclip', '-selection', 'clipboard'], {
        stdin: 'pipe'
      })
      proc.stdin.write(text)
      proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    if (platform === 'win32') {
      const proc = Bun.spawn(['clip.exe'], { stdin: 'pipe' })
      proc.stdin.write(text)
      proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    return false
  } catch {
    return false
  }
}

/**
 * Write a licence file to the specified directory.
 * Defaults to ~/Downloads if no directory is provided.
 * Returns the full path of the written file, or null on failure.
 */
export async function writeLicenceFile(file: LicenceFile, outputDir?: string): Promise<string | null> {
  const rawDir = outputDir ?? '~/Downloads'
  const dir = expandTilde(rawDir)
  const filePath = join(dir, file.name.split(/[\\/]/).pop() || 'licence')

  try {
    const content = Buffer.from(file.data, 'base64')
    await Bun.write(filePath, content)
    return filePath
  } catch {
    return null
  }
}
