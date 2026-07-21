import * as vscode from "vscode";
import { OpslyMarkdownPreviewProvider } from "./previewProvider";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new OpslyMarkdownPreviewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "opsly-md.preview",
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: true,
      }
    ),
    vscode.commands.registerCommand(
      "opsly-md.openPreview",
      async (resource?: vscode.Uri) => {
        let uri = resource;
        if (!uri && vscode.window.activeTextEditor) {
          uri = vscode.window.activeTextEditor.document.uri;
        }
        if (!uri) {
          const picked = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: { Markdown: ["md"] },
            openLabel: "Preview",
          });
          uri = picked?.[0];
        }
        if (!uri) {
          return;
        }

        await vscode.commands.executeCommand(
          "vscode.openWith",
          uri,
          "opsly-md.preview"
        );
      }
    ),
    vscode.window.onDidChangeActiveColorTheme(() => {
      provider.syncThemeToVisiblePreviews();
    })
  );
}

export function deactivate(): void {}
