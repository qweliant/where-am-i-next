// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "where-am-i-next" is now active!'
  );

  // Create status bar item
  const componentTypeStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(componentTypeStatusBarItem);

  // Function to check if file is a React component
  function isReactComponent(document: vscode.TextDocument): boolean {
    const fileExtensions = [".jsx", ".tsx", ".js", ".ts"];
    const fileName = document.fileName.toLowerCase();
    return fileExtensions.some((ext) => fileName.endsWith(ext));
  }

  // Function to check if a file is a client component
  function isClientComponent(document: vscode.TextDocument): boolean {
    const text = document.getText();

    // Check for "use client" directive
    if (text.includes('"use client"') || text.includes("'use client'")) {
      return true;
    }

    // Check for client-side hooks
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
      //   if (
      //     (text.includes(`import`) && text.includes(hook)) ||
      //     new RegExp(`\\b${hook}\\s*\\(`).test(text)
      //   ) {
      //     return true;
      //   }
      if (text.includes(hook)) {
        return true;
      }
    }

    // Check for event handlers
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
      // Match patterns like: onClick={...} or onClick = {...}
      //   if (new RegExp(`\\b${handler}\\s*=`).test(text)) {
      //     return true;
      //   }
      if (text.includes(handler)) {
        return true;
      }
    }

    return false;
  }

  // Function to update decorations
  function updateDecorations(editor: vscode.TextEditor) {
    if (!editor || !isReactComponent(editor.document)) {
      componentTypeStatusBarItem.hide();
      return;
    }

    const isClient = isClientComponent(editor.document);

    // Update status bar
    componentTypeStatusBarItem.text = isClient
      ? "$(browser) Client Component"
      : "$(server) Server Component";
    componentTypeStatusBarItem.tooltip = isClient
      ? "This is a Client Component (runs in the browser)"
      : "This is a Server Component (runs on the server)";
    componentTypeStatusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );

    componentTypeStatusBarItem.show();

    // Show diagnostics if needed
    updateDiagnostics(editor.document);
  }

  // Create diagnostic collection
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("nextjs");
  context.subscriptions.push(diagnosticCollection);

  // Function to update diagnostics
  function updateDiagnostics(document: vscode.TextDocument) {
    if (!isReactComponent(document)) {
      diagnosticCollection.delete(document.uri);
      return;
    }

    const text = document.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    // If it looks like a client component but doesn't have "use client"
    if (!text.includes('"use client"') && !text.includes("'use client'")) {
      const clientSideFeatures = [
        { name: "useState", regex: /\buseState\s*\(/ },
        { name: "useEffect", regex: /\buseEffect\s*\(/ },
        { name: "useRouter", regex: /\buseRouter\s*\(/ },
        { name: "onClick", regex: /\bonClick=/ },
        { name: "onChange", regex: /\bonChange=/ },
      ];

      for (const feature of clientSideFeatures) {
        const matches = text.match(feature.regex);
        if (matches) {
          // Find the position of the match
          const index = text.indexOf(matches[0]);
          const position = document.positionAt(index);
          const range = new vscode.Range(
            position,
            position.translate(0, matches[0].length)
          );

          // Create a diagnostic warning
          const diagnostic = new vscode.Diagnostic(
            range,
            `Client-side feature "${feature.name}" used without "use client" directive`,
            vscode.DiagnosticSeverity.Warning
          );

          // Add code action identifier
          diagnostic.code = "add-use-client";

          diagnostics.push(diagnostic);
        }
      }
    }

    diagnosticCollection.set(document.uri, diagnostics);
  }

  // Register event handlers
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (editor) {
        updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateDecorations(editor);
      }
    },
    null,
    context.subscriptions
  );

  // Register code action provider for quick fixes
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    ["javascript", "javascriptreact", "typescript", "typescriptreact"],
    {
      provideCodeActions(document, range, context) {
        // Filter to only our diagnostics
        const diagnostics = context.diagnostics.filter(
          (d) => d.code === "add-use-client"
        );

        if (diagnostics.length === 0) {
          return;
        }

        // Create the quick fix
        const actions: vscode.CodeAction[] = [];
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

        actions.push(action);
        return actions;
      },
    }
  );
  context.subscriptions.push(codeActionProvider);

  // Command to toggle between client and server component
  const toggleCommand = vscode.commands.registerCommand(
    "where-am-i-next.toggleComponentType",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || !isReactComponent(editor.document)) {
        return;
      }

      const text = editor.document.getText();
      const isClient =
        text.includes('"use client"') || text.includes("'use client'");

      const edit = new vscode.WorkspaceEdit();

      if (isClient) {
        // Remove "use client" directive
        const regex = /(["']use client["'];\s*\n?)/;
        const match = text.match(regex);
        if (match && match.index !== undefined) {
          const startPos = editor.document.positionAt(match.index);
          const endPos = editor.document.positionAt(
            match.index + match[0].length
          );
          edit.delete(editor.document.uri, new vscode.Range(startPos, endPos));
        }
      } else {
        // Add "use client" directive
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

  // Check current editor on activation
  if (vscode.window.activeTextEditor) {
    updateDecorations(vscode.window.activeTextEditor);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
