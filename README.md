# lics

License key manager CLI — quickly look up and copy software license keys from the terminal.

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

# List all licenses
lics --list

# JSON output (for scripting)
lics --json
lics --json figma

# Copy to clipboard (no TUI, one-liner)
lics --copy jetbrains
```

## Development

```bash
bun run dev          # Watch mode
bun test             # Run tests
bunx tsc --noEmit    # Type check
```

## Stack

- **Runtime**: [Bun](https://bun.sh)
- **TUI**: [@opentui/core](https://github.com/anomalyco/opentui) (imperative API)
- **CLI**: [Commander](https://github.com/tj/commander.js)
- **Data**: Mock store (Notion adapter planned)
