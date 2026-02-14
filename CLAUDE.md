# lics — License Key Manager CLI

A CLI tool for looking up software license keys and files, built with OpenTUI and Commander. Backed by a Notion database.

## Architecture

- `src/cli.ts` — Entry point. Commander parses args, then delegates to UI or stdout.
- `src/ui.ts` — All OpenTUI rendering (lookup card, interactive browser, list view, error view).
- `src/store.ts` — Data layer with mock licenses. Will be swapped for Notion adapter later.
- `src/types.ts` — `License` interface and related types. Mirrors the Notion "Licences" database schema.
- `src/clipboard.ts` — Cross-platform clipboard copy (pbcopy/xclip) and license file write-out.

## Notion Database Schema

The Notion database "Licences" (ID: `16cb7795-690c-80d2-b3c7-dd756e2822a0`) has these fields:

| Field         | Type  | Notes                                                      |
| ------------- | ----- | ---------------------------------------------------------- |
| App           | title | Software name — the search target                          |
| License Key   | text  | Key string (nullable — some licenses are files)            |
| License File  | file  | File attachment (nullable — some licenses are keys)        |
| Name          | text  | Registered name                                            |
| Email         | email | Associated email                                           |
| Version       | text  | Software version                                           |
| URL           | url   | Product page / account portal                              |
| Purchase Date | date  | When purchased                                             |
| Expiry Date   | date  | When it expires (null = perpetual), reminder 1 week before |
| Note          | text  | Additional notes                                           |

A license can have a key, a file, both, or neither. The `licenseKind()` helper in `types.ts` discriminates between these cases.

## Commands

- `lics <name>` — Quick lookup with TUI card + clipboard copy / file save
- `lics` — Interactive browser with search and keyboard navigation
- `lics --list` / `-l` — Styled table of all licenses
- `lics --json [name]` / `-j` — JSON output (no TUI)
- `lics --copy <name>` / `-c` — Copy key to clipboard or save file (no TUI)
- `lics --output <dir>` / `-o` — Output directory for license files (default: ~/Downloads)

## License Types

- **Key-based**: License key is copied to clipboard on lookup
- **File-based**: License file is written to output directory (default ~/Downloads)
- **Both**: Key copied AND file written
- **Neither**: Edge case, shows informational message

## OpenTUI Notes

- Uses Core imperative API (`@opentui/core`), not React/Solid reconciler
- `remove(id: string)` — takes an ID string, not a renderable reference
- `engine.register(timeline)` / `engine.unregister(timeline)` — not `addTimeline`
- Easing functions use short names: `outQuad`, `inExpo`, `outBounce`, etc. (not `easeOutQuad`)
- Properties are getter/setters: `box.width = 40`, `text.content = "..."`, `select.options = [...]`
- Never call `process.exit()` directly — use `renderer.destroy()` first
- Tokyo Night color palette: bg `#1a1a2e`, border `#7aa2f7`, text `#c0caf5`

## Bun

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
