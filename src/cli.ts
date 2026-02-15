#!/usr/bin/env bun
import { Command } from 'commander'
import { copyToClipboard, writeLicenceFile } from './clipboard.ts'
import { getConfigPath, loadConfig, openConfigInEditor } from './config.ts'
import { getAllLicences, getLicence, searchLicences } from './store.ts'
import { licenceKind } from './types.ts'
import { renderBrowser, renderDisambiguate, renderError, renderList, renderLookup } from './ui.ts'

const program = new Command()

program
  .name('lics')
  .description('Licence key manager — quickly look up and copy software licence keys')
  .version('0.1.0')
  .argument('[name]', 'software name to look up')
  .option('-l, --list', 'list all licences')
  .option('-j, --json [name]', 'output as JSON')
  .option('-c, --copy <name>', 'copy licence key to clipboard (no TUI)')
  .option('-o, --output <dir>', 'output directory for licence files')
  .option('--edit-config', 'Open the configuration file in your editor')
  .option('--xyzzy', 'Enable full CLI (bypass coming soon screen)')
  .action(
    async (
      name: string | undefined,
      options: {
        list?: boolean
        json?: string | boolean
        copy?: string
        output?: string
        editConfig?: boolean
        xyzzy?: boolean
      }
    ) => {
      const { config, isFirstRun } = await loadConfig()

      if (options.editConfig) {
        await openConfigInEditor()
        return
      }

      if (isFirstRun) {
        console.log(`Configuration file created at ${getConfigPath()}`)
        console.log('Edit it with: lics --edit-config')
        console.log()
      }

      const outputDir = options.output ?? config.outputPath

      // Coming soon gate - remove this block to enable full CLI
      if (!process.env.LICS_MISE_ACTIVE && !options.xyzzy) {
const { renderComingSoon } = await import('./coming-soon.ts')
        await renderComingSoon()
        return
      }

      // --json mode: no TUI, just stdout
      if (options.json !== undefined) {
        const jsonName = typeof options.json === 'string' ? options.json : name
        if (jsonName) {
          const licence = getLicence(jsonName)
          if (licence) {
            console.log(JSON.stringify(licence, null, 2))
          } else {
            console.error(`No licence found for "${jsonName}"`)
            process.exit(1)
          }
        } else {
          console.log(JSON.stringify(getAllLicences(), null, 2))
        }
        return
      }

      // --copy mode: no TUI, clipboard or file write + one-liner
      if (options.copy) {
        const licence = getLicence(options.copy)
        if (!licence) {
          console.error(`No licence found for "${options.copy}"`)
          process.exit(1)
        }

        const kind = licenceKind(licence)

        if (kind === 'key' || kind === 'both') {
          const ok = await copyToClipboard(licence.licenceKey!)
          if (ok) {
            console.log(`✓ ${licence.app} key copied to clipboard`)
          } else {
            // Fallback: print the key to stdout
            console.log(licence.licenceKey)
          }
        }

        if (kind === 'file' || kind === 'both') {
          const path = await writeLicenceFile(licence.licenceFile!, outputDir)
          if (path) {
            console.log(`✓ ${licence.app} licence file saved to ${path}`)
          } else {
            console.error(`✗ Failed to write licence file for ${licence.app}`)
            process.exit(1)
          }
        }

        if (kind === 'none') {
          console.error(`No key or file available for "${licence.app}"`)
          process.exit(1)
        }

        return
      }

      // --list mode: styled table
      if (options.list) {
        await renderList(getAllLicences())
        return
      }

      // Quick lookup: lics <name>
      if (name) {
        const matches = searchLicences(name)
        if (matches.length === 0) {
          await renderError(`No licence found for "${name}"`, name)
        } else if (matches.length === 1) {
          await renderLookup(matches[0]!, outputDir)
        } else {
          await renderDisambiguate(matches, outputDir)
        }
        return
      }

      // Interactive browser: lics (no args)
      await renderBrowser(getAllLicences(), outputDir)
    }
  )

program.parse()
