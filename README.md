# `lics`

Licence key manager CLI.

Quickly look up and copy software licence keys from the terminal.

> **Note**: LICS is currently in development and will show a "Coming Soon" screen when run. See [Development](#development) for bypass instructions.

Built with [OpenTUI](https://github.com/anomalyco/opentui) for rich terminal rendering and [Commander](https://github.com/tj/commander.js) for argument parsing.

## Install

```bash
bun install
bun link
```

## Usage

```bash
# Quick lookup — shows styled card, copies key to clipboard
lics sublime

# Interactive browser — search and navigate with keyboard
lics

# List all licences
lics --list

# JSON output (for scripting)
lics --json
lics --json figma

# Copy to clipboard (no TUI, one-liner)
lics --copy jetbrains
```

## Configuration

On first run, `lics` creates a configuration file with sensible defaults:

| Platform | Path                                                                        |
| -------- | --------------------------------------------------------------------------- |
| macOS    | `~/.config/lics/config.json`                                                |
| Linux    | `$XDG_CONFIG_HOME/lics/config.json` (default: `~/.config/lics/config.json`) |
| Windows  | `%APPDATA%\lics\config.json`                                                |

### Config fields

| Field          | Type   | Default         | Description                       |
| -------------- | ------ | --------------- | --------------------------------- |
| `databaseId`   | string | `""`            | Notion database ID                |
| `databaseName` | string | `"Licences"`    | Display name for the database     |
| `outputPath`   | string | `"~/Downloads"` | Directory for licence file output |

### Editing configuration

```bash
# Open config in your $EDITOR
lics --edit-config
```

### Environment variable overrides

Environment variables take precedence over config file values:

- `LICS_DATABASE_ID` — overrides `databaseId`
- `LICS_DATABASE_NAME` — overrides `databaseName`

The `-o` / `--output` CLI flag overrides `outputPath` per-invocation.

## Development

```bash
bun run dev          # Watch mode
bun test             # Run tests
bunx tsc --noEmit    # Type check
```

### Bypass Coming Soon Screen

While in development, use either:

```bash
# Using environment variable
LICS_MISE_ACTIVE=1 bun src/cli.ts --list

# Using the --xyzzy flag
bun src/cli.ts --xyzzy --list
```

## Stack

- **Runtime**: [`bun`](https://bun.sh)
- **TUI**: [`@opentui/core`](https://github.com/anomalyco/opentui) (imperative API)
- **CLI**: [`commander`](https://github.com/tj/commander.js)
- **Data**: Mock store (Notion adapter planned)

## Upcoming

- [x] Add JSON config in `$XDG_CONFIG_HOME/lics/config.json`
  - [x] Database ID (required)
  - [x] Database name (optional, display only)
  - [x] Path to write licence files (default: `~/Downloads`)
- [x] Add support for multiple licences per product
- [x] Add support for multiple products per licence
- [ ] Add Notion adapter
