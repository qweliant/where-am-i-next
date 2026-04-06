import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers — mirror the pure logic from extension.ts so we can test it without
// spinning up a VS Code host.
// ---------------------------------------------------------------------------

function parseNextVersion(versionStr: string): number {
  const cleaned = versionStr.replace(/[^0-9.]/g, '');
  const major = parseInt(cleaned.split('.')[0], 10);
  return isNaN(major) ? 0 : major;
}

function isClientComponent(text: string): boolean {
  if (text.includes('"use client"') || text.includes("'use client'")) {
    return true;
  }
  const clientSideHooks = [
    'useState', 'useEffect', 'useContext', 'useReducer',
    'useCallback', 'useMemo', 'useRef', 'useLayoutEffect', 'useRouter',
  ];
  for (const hook of clientSideHooks) {
    if (text.includes(hook)) {return true;}
  }
  const eventHandlers = [
    'onClick', 'onChange', 'onSubmit', 'onMouseOver',
    'onKeyDown', 'onFocus', 'onBlur',
  ];
  for (const handler of eventHandlers) {
    if (text.includes(handler)) {return true;}
  }
  return false;
}

function isInPagesDir(filePath: string, workspaceRoot: string): boolean {
  const rel = path.relative(workspaceRoot, filePath);
  return (
    rel.startsWith('pages' + path.sep) ||
    rel.startsWith(path.join('src', 'pages') + path.sep)
  );
}

function isInAppDir(filePath: string, workspaceRoot: string): boolean {
  const rel = path.relative(workspaceRoot, filePath);
  return (
    rel.startsWith('app' + path.sep) ||
    rel.startsWith(path.join('src', 'app') + path.sep)
  );
}

// Simplified version of detectNextJs for unit testing
function detectNextJs(workspaceRoot: string) {
  const notNext = { isNextJs: false, majorVersion: 0, hasAppDir: false };

  const configFiles = [
    'next.config.js', 'next.config.ts', 'next.config.mjs', 'next.config.cjs',
  ];
  const hasConfig = configFiles.some(f =>
    fs.existsSync(path.join(workspaceRoot, f))
  );

  let majorVersion = 0;
  const pkgPath = path.join(workspaceRoot, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      if (allDeps['next']) {
        majorVersion = parseNextVersion(allDeps['next']);
      } else if (!hasConfig) {
        return notNext;
      }
    } catch {
      if (!hasConfig) {return notNext;}
    }
  } else if (!hasConfig) {
    return notNext;
  }

  const hasAppDir =
    fs.existsSync(path.join(workspaceRoot, 'app')) ||
    fs.existsSync(path.join(workspaceRoot, 'src', 'app'));

  return { isNextJs: true, majorVersion, hasAppDir };
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeTmpProject(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'next-ext-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

function cleanup(root: string) {
  fs.rmSync(root, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

suite('parseNextVersion', () => {
  test('parses caret range', () => assert.strictEqual(parseNextVersion('^13.4.0'), 13));
  test('parses tilde range', () => assert.strictEqual(parseNextVersion('~14.1.0'), 14));
  test('parses exact version', () => assert.strictEqual(parseNextVersion('12.3.4'), 12));
  test('parses major-only', () => assert.strictEqual(parseNextVersion('15'), 15));
  test('returns 0 for latest', () => assert.strictEqual(parseNextVersion('latest'), 0));
  test('returns 0 for empty string', () => assert.strictEqual(parseNextVersion(''), 0));
});

suite('isClientComponent', () => {
  test('detects "use client" double quotes', () =>
    assert.ok(isClientComponent('"use client";\nexport default function Page() {}')));

  test('detects "use client" single quotes', () =>
    assert.ok(isClientComponent("'use client';\nexport default function Page() {}")));

  test('detects useState', () =>
    assert.ok(isClientComponent('import { useState } from "react"')));

  test('detects onClick', () =>
    assert.ok(isClientComponent('<button onClick={handleClick} />')));

  test('detects useRouter', () =>
    assert.ok(isClientComponent('const router = useRouter()')));

  test('returns false for plain server component', () =>
    assert.strictEqual(isClientComponent('export default async function Page() { return <div />; }'), false));
});

suite('isInPagesDir / isInAppDir', () => {
  const root = '/workspace';

  test('pages/index.tsx is in pages dir', () =>
    assert.ok(isInPagesDir(path.join(root, 'pages', 'index.tsx'), root)));

  test('src/pages/index.tsx is in pages dir', () =>
    assert.ok(isInPagesDir(path.join(root, 'src', 'pages', 'index.tsx'), root)));

  test('app/page.tsx is NOT in pages dir', () =>
    assert.strictEqual(isInPagesDir(path.join(root, 'app', 'page.tsx'), root), false));

  test('app/page.tsx is in app dir', () =>
    assert.ok(isInAppDir(path.join(root, 'app', 'page.tsx'), root)));

  test('src/app/page.tsx is in app dir', () =>
    assert.ok(isInAppDir(path.join(root, 'src', 'app', 'page.tsx'), root)));

  test('components/Button.tsx is in neither', () => {
    const file = path.join(root, 'components', 'Button.tsx');
    assert.strictEqual(isInPagesDir(file, root), false);
    assert.strictEqual(isInAppDir(file, root), false);
  });
});

suite('detectNextJs', () => {
  test('detects Next.js v14 from package.json', () => {
    const root = makeTmpProject({
      'package.json': JSON.stringify({ dependencies: { next: '^14.0.0' } }),
    });
    try {
      const info = detectNextJs(root);
      assert.ok(info.isNextJs);
      assert.strictEqual(info.majorVersion, 14);
    } finally {
      cleanup(root);
    }
  });

  test('detects Next.js from next.config.js even without package.json next dep', () => {
    const root = makeTmpProject({
      'next.config.js': 'module.exports = {}',
    });
    try {
      const info = detectNextJs(root);
      assert.ok(info.isNextJs);
    } finally {
      cleanup(root);
    }
  });

  test('returns isNextJs=false for a plain Node project', () => {
    const root = makeTmpProject({
      'package.json': JSON.stringify({ dependencies: { express: '^4.0.0' } }),
    });
    try {
      const info = detectNextJs(root);
      assert.strictEqual(info.isNextJs, false);
    } finally {
      cleanup(root);
    }
  });

  test('detects app directory', () => {
    const root = makeTmpProject({
      'package.json': JSON.stringify({ dependencies: { next: '^13.0.0' } }),
      'app/page.tsx': 'export default function Page() {}',
    });
    try {
      const info = detectNextJs(root);
      assert.ok(info.hasAppDir);
    } finally {
      cleanup(root);
    }
  });

  test('hasAppDir is false when only pages/ exists', () => {
    const root = makeTmpProject({
      'package.json': JSON.stringify({ dependencies: { next: '^13.0.0' } }),
      'pages/index.tsx': 'export default function Home() {}',
    });
    try {
      const info = detectNextJs(root);
      assert.strictEqual(info.hasAppDir, false);
    } finally {
      cleanup(root);
    }
  });

  test('returns isNextJs=false for empty directory', () => {
    const root = makeTmpProject({});
    try {
      const info = detectNextJs(root);
      assert.strictEqual(info.isNextJs, false);
    } finally {
      cleanup(root);
    }
  });
});
