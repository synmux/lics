/**
 * Copy text to the system clipboard.
 * Uses pbcopy on macOS, xclip on Linux.
 * Returns true if successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = process.platform

  try {
    if (platform === "darwin") {
      const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" })
      proc.stdin.write(text)
      proc.stdin.end()
      await proc.exited
      return proc.exitCode === 0
    }

    if (platform === "linux") {
      const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
        stdin: "pipe",
      })
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
