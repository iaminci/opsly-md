import * as vscode from "vscode";
import { getWebviewHtml } from "./webviewHtml";

function themeKindToCss(
  kind: vscode.ColorThemeKind
): "light" | "dark" | "high-contrast" {
  switch (kind) {
    case vscode.ColorThemeKind.Dark:
      return "dark";
    case vscode.ColorThemeKind.HighContrast:
    case vscode.ColorThemeKind.HighContrastLight:
      return "high-contrast";
    default:
      return "light";
  }
}

export class OpslyMarkdownPreviewProvider
  implements vscode.CustomTextEditorProvider
{
  private readonly panels = new Set<vscode.WebviewPanel>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  syncThemeToVisiblePreviews(): void {
    const kind = themeKindToCss(vscode.window.activeColorTheme.kind);
    for (const panel of this.panels) {
      panel.webview.postMessage({ type: "theme", kind });
    }
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    this.panels.add(webviewPanel);
    webviewPanel.onDidDispose(() => {
      this.panels.delete(webviewPanel);
    });

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, "media"),
      ],
    };

    webviewPanel.webview.html = getWebviewHtml(
      webviewPanel.webview,
      this.extensionUri
    );

    const postUpdate = (): void => {
      webviewPanel.webview.postMessage({
        type: "update",
        content: document.getText(),
        fileName: document.fileName,
      });
    };

    const postTheme = (): void => {
      webviewPanel.webview.postMessage({
        type: "theme",
        kind: themeKindToCss(vscode.window.activeColorTheme.kind),
      });
    };

    postUpdate();
    postTheme();

    const changeSub = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === document.uri.toString()) {
        postUpdate();
      }
    });

    const messageSub = webviewPanel.webview.onDidReceiveMessage((message) => {
      if (message?.type === "ready") {
        postUpdate();
        postTheme();
      }
      if (message?.type === "openLink" && typeof message.href === "string") {
        void vscode.env.openExternal(vscode.Uri.parse(message.href));
      }
      if (
        message?.type === "patchContent" &&
        typeof message.startOffset === "number" &&
        typeof message.endOffset === "number" &&
        typeof message.replacement === "string"
      ) {
        const start = document.positionAt(message.startOffset);
        const end = document.positionAt(message.endOffset);
        const patchEdit = new vscode.WorkspaceEdit();
        patchEdit.replace(document.uri, new vscode.Range(start, end), message.replacement);
        void vscode.workspace.applyEdit(patchEdit);
      }
      if (message?.type === "updateContent" && typeof message.content === "string") {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
        const replaceEdit = new vscode.WorkspaceEdit();
        replaceEdit.replace(document.uri, fullRange, message.content);
        void vscode.workspace.applyEdit(replaceEdit);
      }
    });

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      messageSub.dispose();
    });
  }
}
