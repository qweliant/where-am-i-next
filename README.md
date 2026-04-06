# Where Am I Next

**Where Am I Next** is a VS Code extension that tells you whether the file you're editing is a **Client Component**, **Server Component**, or **Pages Router** file — but only inside actual Next.js projects.

## Features

- **Component Type Detection**: Detects client vs server components based on directives, hooks, and event handlers
- **Status Bar Indicator**: Shows component type in the status bar for quick reference
- **Next.js-only**: Stays hidden in plain Node.js or non-Next.js React projects
- **Multi-version support**: Handles Next.js v1–v12 (Pages Router) and v13+ (App Router)
- **Diagnostic Warnings**: Alerts you when using client-side features without `"use client"`
- **Quick Fix**: One-click to add the `"use client"` directive
- **Toggle Command**: Adds or removes `"use client"` with a single command

## How It Works

The extension first checks whether the open workspace is a Next.js project by looking for:
- A `next.config.js`, `next.config.ts`, `next.config.mjs`, or `next.config.cjs` file
- `"next"` listed in `package.json` dependencies

If neither is found, the extension stays hidden.

### Next.js Version Behavior

| Version | Behavior |
|---------|----------|
| v13+ with App Router | Shows **Client Component** or **Server Component** |
| v1–v12 | Shows **Pages Router** — no RSC concept in these versions |
| Files in `pages/` | Always shows **Pages Router**, regardless of Next.js version |

### Client Component Detection (Next.js 13+)

A file is treated as a Client Component if it contains any of:

- `"use client"` directive
- Hooks: `useState`, `useEffect`, `useContext`, `useReducer`, `useCallback`, `useMemo`, `useRef`, `useLayoutEffect`, `useRouter`
- Event handlers: `onClick`, `onChange`, `onSubmit`, `onMouseOver`, `onKeyDown`, `onFocus`, `onBlur`

Otherwise it is treated as a Server Component.

## Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Where Am I Next"
4. Click Install

Or install from the marketplace: [VS Code Marketplace: Where Am I Next](https://marketplace.visualstudio.com/items?itemName=qwelian.where-am-i-next)

## Usage

Open any file in a Next.js project. The extension automatically shows the component type in the status bar and flags issues as you type.

### Commands

- **Where Am I Next: Toggle Component Type** — adds or removes the `"use client"` directive (Next.js 13+ only)

## Requirements

- VS Code 1.98.0 or higher
- A Next.js project in your workspace

## Extension Settings

No configurable settings at this time.

## Known Issues

Please report issues on the [GitHub repository](https://github.com/qwelian/where-am-i-next/issues).

## Release Notes

### 0.1.0

- Extension now only activates inside Next.js projects (detected via `next.config.*` or `package.json`)
- Added multi-version support: Next.js v1–v12 shows "Pages Router", v13+ shows Client/Server Component
- Files in the `pages/` directory always show "Pages Router"
- Diagnostics and quick fixes now only fire in Next.js 13+ App Router files
- Toggle command is disabled in non-Next.js or pre-v13 projects
- Next.js detection results are cached and invalidated when `package.json` or `next.config.*` changes

### 0.0.1

- Initial release
- Basic client/server component detection
- Status bar indicator
- Quick fix for adding `"use client"` directive

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues on the GitHub repository.

## License

MIT License

## Author

Created by [qwelian](mailto:dmtorcode@tutanota.com)
