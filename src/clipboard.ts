import { join } from "node:path";
import { homedir } from "node:os";
import type { LicenseFile } from "./types.ts";

/**
 * Copy text to the system clipboard.
 * Uses pbcopy on macOS, xclip on Linux.
 * Returns true if successful, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = process.platform;

  try {
    if (platform === "darwin") {
      const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return proc.exitCode === 0;
    }

    if (platform === "linux") {
      const proc = Bun.spawn(["xclip", "-selection", "clipboard"], {
        stdin: "pipe",
      });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      return proc.exitCode === 0;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Write a license file to the specified directory.
 * Defaults to ~/Downloads if no directory is provided.
 * Returns the full path of the written file, or null on failure.
 */
export async function writeLicenseFile(
  file: LicenseFile,
  outputDir?: string,
): Promise<string | null> {
  const dir = outputDir ?? join(homedir(), "Downloads");
  const filePath = join(dir, file.name);

  try {
    const content = Buffer.from(file.data, "base64");
    await Bun.write(filePath, content);
    return filePath;
  } catch {
    return null;
  }
}
