# Change Log

All notable changes to the "where-am-i-next" extension will be documented in this file.

## [0.1.0]

### Added
- Next.js project detection via `next.config.*` and `package.json` — extension now stays hidden in non-Next.js projects
- Multi-version support: Next.js v1–v12 shows "Pages Router", v13+ shows Client/Server Component
- File path awareness: files in `pages/` or `src/pages/` always show "Pages Router"
- Version label shown in tooltip (e.g. "Next.js v14")
- Detection cache per workspace, invalidated when `package.json` or `next.config.*` changes

### Changed
- Diagnostics and quick fixes only fire for Next.js 13+ App Router files
- Toggle command is a no-op in non-Next.js or pre-v13 projects

## [0.0.1]

- Initial release
- Basic client/server component detection
- Status bar indicator
- Quick fix for adding `"use client"` directive
