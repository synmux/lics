#!/usr/bin/env bun
import { Command } from "commander"
import { homedir } from "node:os"
import { join } from "node:path"
import { searchLicenses, getAllLicenses, getLicense } from "./store.ts"
import { licenseKind } from "./types.ts"
import { copyToClipboard, writeLicenseFile } from "./clipboard.ts"
import {
  renderLookup,
  renderDisambiguate,
  renderBrowser,
  renderList,
  renderError,
} from "./ui.ts"

const program = new Command()

program
  .name("lics")
  .description("License key manager — quickly look up and copy software license keys")
  .version("0.1.0")
  .argument("[name]", "software name to look up")
  .option("-l, --list", "list all licenses")
  .option("-j, --json [name]", "output as JSON")
  .option("-c, --copy <name>", "copy license key to clipboard (no TUI)")
  .option("-o, --output <dir>", "output directory for license files", join(homedir(), "Downloads"))
  .action(async (name: string | undefined, options: {
    list?: boolean
    json?: string | boolean
    copy?: string
    output: string
  }) => {
    // --json mode: no TUI, just stdout
    if (options.json !== undefined) {
      const jsonName = typeof options.json === "string" ? options.json : name
      if (jsonName) {
        const license = getLicense(jsonName)
        if (license) {
          console.log(JSON.stringify(license, null, 2))
        } else {
          console.error(`No license found for "${jsonName}"`)
          process.exit(1)
        }
      } else {
        console.log(JSON.stringify(getAllLicenses(), null, 2))
      }
      return
    }

    // --copy mode: no TUI, clipboard or file write + one-liner
    if (options.copy) {
      const license = getLicense(options.copy)
      if (!license) {
        console.error(`No license found for "${options.copy}"`)
        process.exit(1)
      }

      const kind = licenseKind(license)

      if (kind === "key" || kind === "both") {
        const ok = await copyToClipboard(license.licenseKey!)
        if (ok) {
          console.log(`✓ ${license.app} key copied to clipboard`)
        } else {
          // Fallback: print the key to stdout
          console.log(license.licenseKey)
        }
      }

      if (kind === "file" || kind === "both") {
        const path = await writeLicenseFile(license.licenseFile!, options.output)
        if (path) {
          console.log(`✓ ${license.app} license file saved to ${path}`)
        } else {
          console.error(`✗ Failed to write license file for ${license.app}`)
          process.exit(1)
        }
      }

      if (kind === "none") {
        console.error(`No key or file available for "${license.app}"`)
        process.exit(1)
      }

      return
    }

    // --list mode: styled table
    if (options.list) {
      await renderList(getAllLicenses())
      return
    }

    // Quick lookup: lics <name>
    if (name) {
      const matches = searchLicenses(name)
      if (matches.length === 0) {
        await renderError(`No license found for "${name}"`, name)
      } else if (matches.length === 1) {
        await renderLookup(matches[0]!, options.output)
      } else {
        await renderDisambiguate(matches, options.output)
      }
      return
    }

    // Interactive browser: lics (no args)
    await renderBrowser(getAllLicenses(), options.output)
  })

program.parse()
