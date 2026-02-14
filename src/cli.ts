#!/usr/bin/env bun
import { Command } from "commander"
import { searchLicenses, getAllLicenses, getLicense } from "./store.ts"
import { copyToClipboard } from "./clipboard.ts"
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
  .action(async (name: string | undefined, options: { list?: boolean; json?: string | boolean; copy?: string }) => {
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

    // --copy mode: no TUI, clipboard + one-liner
    if (options.copy) {
      const license = getLicense(options.copy)
      if (!license) {
        console.error(`No license found for "${options.copy}"`)
        process.exit(1)
      }
      const ok = await copyToClipboard(license.key)
      if (ok) {
        console.log(`✓ ${license.software} key copied to clipboard`)
      } else {
        console.log(license.key)
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
        await renderLookup(matches[0]!)
      } else {
        await renderDisambiguate(matches)
      }
      return
    }

    // Interactive browser: lics (no args)
    await renderBrowser(getAllLicenses())
  })

program.parse()
