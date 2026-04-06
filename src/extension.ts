import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

interface NextJsInfo {
  isNextJs: boolean;
  majorVersion: number; // 0 = unknown/not found
  hasAppDir: boolean;
}

// Cache per workspace folder path
const nextJsInfoCache = new Map<string, NextJsInfo>();

function getWorkspaceRoot(filePath: string): string | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
  return folder?.uri.fsPath;
}

function parseNextVersion(versionStr: string): number {
  // Handle semver ranges like "^13.4.0", "~14.0.0", "13.x", "latest", etc.
  const cleaned = versionStr.replace(/[^0-9.]/g, "");
  const major = parseInt(cleaned.split(".")[0], 10);
  return isNaN(major) ? 0 : major;
}

function detectNextJs(workspaceRoot: string): NextJsInfo {
  const cached = nextJsInfoCache.get(workspaceRoot);
  if (cached) return cached;

  const notNext: NextJsInfo = { isNextJs: false, majorVersion: 0, hasAppDir: false };

  // Check for next.config.* as a strong signal
  const configFiles = [
    "next.config.js",
    "next.config.ts",
    "next.config.mjs",
    "next.config.cjs",
  ];
  const hasConfig = configFiles.some((f) =>
    fs.existsSync(path.join(workspaceRoot, f))
  );

  // Read package.json for version
  let majorVersion = 0;
  const pkgPath = path.join(workspaceRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const allDeps = {
        ...(pkg.dependencies ?? {}),
        ...(pkg.devDependencies ?? {}),
      };
      if (allDeps["next"]) {
        majorVersion = parseNextVersion(allDeps["next"]);
      } else if (!hasConfig) {
        // No config file and no "next" dep — not a Next.js project
        nextJsInfoCache.set(workspaceRoot, notNext);
        return notNext;
      }
    } catch {
      if (!hasConfig) {
        nextJsInfoCache.set(workspaceRoot, notNext);
        return notNext;
      }
    }
  } else if (!hasConfig) {
    nextJsInfoCache.set(workspaceRoot, notNext);
    return notNext;
  }

  // Check for app directory (Next.js 13+ App Router)
  const hasAppDir =
    fs.existsSync(path.join(workspaceRoot, "app")) ||
    fs.existsSync(path.join(workspaceRoot, "src", "app"));

  const result: NextJsInfo = { isNextJs: true, majorVersion, hasAppDir };
  nextJsInfoCache.set(workspaceRoot, result);
  return result;
}

function isInPagesDir(filePath: string, workspaceRoot: string): boolean {
  const rel = path.relative(workspaceRoot, filePath);
  return rel.startsWith("pages" + path.sep) || rel.startsWith(path.join("src", "pages") + path.sep);
}

function isInAppDir(filePath: string, workspaceRoot: string): boolean {
  const rel = path.relative(workspaceRoot, filePath);
  return rel.startsWith("app" + path.sep) || rel.startsWith(path.join("src", "app") + path.sep);
}

function isReactFile(document: vscode.TextDocument): boolean {
  const fileExtensions = [".jsx", ".tsx", ".js", ".ts"];
  return fileExtensions.some((ext) => document.fileName.toLowerCase().endsWith(ext));
}

function isClientComponent(document: vscode.TextDocument): boolean {
  const text = document.getText();

  if (text.includes('"use client"') || text.includes("'use client'")) {
    return true;
  }

  const clientSideHooks = [
    "useState",
    "useEffect",
    "useContext",
    "useReducer",
    "useCallback",
    "useMemo",
    "useRef",
    "useLayoutEffect",
    "useRouter",
  ];

  for (const hook of clientSideHooks) {
    if (text.includes(hook)) return true;
  }

  const eventHandlers = [
    "onClick",
    "onChange",
    "onSubmit",
    "onMouseOver",
    "onKeyDown",
    "onFocus",
    "onBlur",
  ];

  for (const handler of eventHandlers) {
    if (text.includes(handler)) return true;
  }

  return false;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "where-am-i-next" is now active!');

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItem);

  // Invalidate cache when workspace files change (e.g. package.json edited)
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/package.json",
    false,
    false,
    false
  );
  watcher.onDidChange(() => nextJsInfoCache.clear());
  watcher.onDidCreate(() => nextJsInfoCache.clear());
  watcher.onDidDelete(() => nextJsInfoCache.clear());
  context.subscriptions.push(watcher);

  const configWatcher = vscode.workspace.createFileSystemWatcher(
    "**/next.config.{js,ts,mjs,cjs}",
    false,
    false,
    false
  );
  configWatcher.onDidChange(() => nextJsInfoCache.clear());
  configWatcher.onDidCreate(() => nextJsInfoCache.clear());
  configWatcher.onDidDelete(() => nextJsInfoCache.clear());
  context.subscriptions.push(configWatcher);

  function updateStatusBar(editor: vscode.TextEditor) {
    if (!editor || !isReactFile(editor.document)) {
      statusBarItem.hide();
      return;
    }

    const filePath = editor.document.fileName;
    const workspaceRoot = getWorkspaceRoot(filePath);

    if (!workspaceRoot) {
      statusBarItem.hide();
      return;
    }

    const nextInfo = detectNextJs(workspaceRoot);

    if (!nextInfo.isNextJs) {
      statusBarItem.hide();
      return;
    }

    const versionLabel =
      nextInfo.majorVersion > 0 ? ` (v${nextInfo.majorVersion})` : "";

    // Next.js < 13: only Pages Router existed
    if (nextInfo.majorVersion > 0 && nextInfo.majorVersion < 13) {
      statusBarItem.text = `$(file-code) Pages Router${versionLabel}`;
      statusBarItem.tooltip = `Next.js${versionLabel}: Pages Router (no React Server Components)`;
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();
      return;
    }

    // File is explicitly in pages/ directory
    if (isInPagesDir(filePath, workspaceRoot)) {
      statusBarItem.text = `$(file-code) Pages Router`;
      statusBarItem.tooltip = "This file is in the Pages Router (pages/ directory)";
      statusBarItem.backgroundColor = undefined;
      statusBarItem.show();
      return;
    }

    // Next.js 13+ App Router: detect client vs server
    const isClient = isClientComponent(editor.document);
    const inApp = isInAppDir(filePath, workspaceRoot);
    const locationHint = inApp ? "" : " (outside app/)";

    statusBarItem.text = isClient
      ? `$(browser) Client Component`
      : `$(server) Server Component`;
    statusBarItem.tooltip = isClient
      ? `Client Component — runs in the browser${locationHint}`
      : `Server Component — runs on the server${locationHint}`;
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
    statusBarItem.show();

    updateDiagnostics(editor.document);
  }

  // Diagnostic collection
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("nextjs");
  context.subscriptions.push(diagnosticCollection);

  function updateDiagnostics(document: vscode.TextDocument) {
    const workspaceRoot = getWorkspaceRoot(document.fileName);
    if (!workspaceRoot) {
      diagnosticCollection.delete(document.uri);
      return;
    }

    const nextInfo = detectNextJs(workspaceRoot);

    // Only warn about missing "use client" for Next.js 13+ app router files
    if (
      !nextInfo.isNextJs ||
      nextInfo.majorVersion < 13 ||
      isInPagesDir(document.fileName, workspaceRoot)
    ) {
      diagnosticCollection.delete(document.uri);
      return;
    }

    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    if (!text.includes('"use client"') && !text.includes("'use client'")) {
      const clientSideFeatures = [
        { name: "useState", regex: /\buseState\s*\(/ },
        { name: "useEffect", regex: /\buseEffect\s*\(/ },
        { name: "useRouter", regex: /\buseRouter\s*\(/ },
        { name: "onClick", regex: /\bonClick=/ },
        { name: "onChange", regex: /\bonChange=/ },
      ];

      for (const feature of clientSideFeatures) {
        const match = text.match(feature.regex);
        if (match && match.index !== undefined) {
          const position = document.positionAt(match.index);
          const range = new vscode.Range(
            position,
            position.translate(0, match[0].length)
          );
          const diagnostic = new vscode.Diagnostic(
            range,
            `Client-side feature "${feature.name}" used without "use client" directive`,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.code = "add-use-client";
          diagnostics.push(diagnostic);
        }
      }
    }

    diagnosticCollection.set(document.uri, diagnostics);
  }

  // Event listeners
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) updateStatusBar(editor);
      else statusBarItem.hide();
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateStatusBar(editor);
      }
    },
    null,
    context.subscriptions
  );

  // Code action provider
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    ["javascript", "javascriptreact", "typescript", "typescriptreact"],
    {
      provideCodeActions(document, _range, context) {
        const diagnostics = context.diagnostics.filter(
          (d) => d.code === "add-use-client"
        );
        if (diagnostics.length === 0) return;

        const action = new vscode.CodeAction(
          'Add "use client" directive',
          vscode.CodeActionKind.QuickFix
        );
        action.edit = new vscode.WorkspaceEdit();
        action.edit.insert(
          document.uri,
          new vscode.Position(0, 0),
          '"use client";\n\n'
        );
        return [action];
      },
    }
  );
  context.subscriptions.push(codeActionProvider);

  // Toggle command
  const toggleCommand = vscode.commands.registerCommand(
    "where-am-i-next.toggleComponentType",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isReactFile(editor.document)) return;

      const workspaceRoot = getWorkspaceRoot(editor.document.fileName);
      if (!workspaceRoot) return;

      const nextInfo = detectNextJs(workspaceRoot);
      if (!nextInfo.isNextJs || nextInfo.majorVersion < 13) return;

      const text = editor.document.getText();
      const isClient =
        text.includes('"use client"') || text.includes("'use client'");
      const edit = new vscode.WorkspaceEdit();

      if (isClient) {
        const match = text.match(/(["']use client["'];\s*\n?)/);
        if (match && match.index !== undefined) {
          const startPos = editor.document.positionAt(match.index);
          const endPos = editor.document.positionAt(
            match.index + match[0].length
          );
          edit.delete(editor.document.uri, new vscode.Range(startPos, endPos));
        }
      } else {
        edit.insert(
          editor.document.uri,
          new vscode.Position(0, 0),
          '"use client";\n\n'
        );
      }

      await vscode.workspace.applyEdit(edit);
    }
  );
  context.subscriptions.push(toggleCommand);

  // Initialize for current editor
  if (vscode.window.activeTextEditor) {
    updateStatusBar(vscode.window.activeTextEditor);
  }
}

export function deactivate() {}
