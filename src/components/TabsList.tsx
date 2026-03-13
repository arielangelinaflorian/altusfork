import { Dialog } from "@kobalte/core";
import { Component, Show, createSignal, onCleanup } from "solid-js";
import {
  getActivePartitionId,
  getActiveWebviewElement,
  recycleActiveWebview,
  setPendingChatRestore,
} from "../stores/tabs/solid";
import NewChatDialog from "./NewChatDialog";

const TabsList: Component = () => {
  const [canShowNewChatDialog, setShowNewChatDialog] = createSignal(false);

  const handlers = new Set<() => void>();
  onCleanup(() => {
    for (const cleanup of handlers) {
      cleanup();
    }
  });

  handlers.add(
    window.electronIPCHandlers.onOpenWhatsappLink((url) => {
      const activeWebview = getActiveWebviewElement();
      if (!activeWebview) return;
      activeWebview.src = url;
    })
  );

  handlers.add(
    window.electronIPCHandlers.onOpenTabDevTools(() => {
      const activeWebview = getActiveWebviewElement();
      if (!activeWebview) return;
      activeWebview.openDevTools();
    })
  );

  handlers.add(
    window.electronIPCHandlers.onReloadActiveSession(async () => {
      const activeWebview = getActiveWebviewElement();
      if (!activeWebview) return;
      setPendingChatRestore(await captureActiveChatTitle(activeWebview));
      await window.sessionTools.signalRefreshActivity();
      activeWebview.reload();
    })
  );

  handlers.add(
    window.electronIPCHandlers.onRecycleActiveSession(async () => {
      const activeWebview = getActiveWebviewElement();
      if (activeWebview) {
        setPendingChatRestore(await captureActiveChatTitle(activeWebview));
      }
      await window.sessionTools.signalRefreshActivity();
      recycleActiveWebview();
    })
  );

  handlers.add(
    window.electronIPCHandlers.onShowSessionDiagnostics(async () => {
      const partition = getActivePartitionId();
      if (!partition) return;

      const diagnostics = await window.sessionTools.getDiagnostics(partition);
      await window.showMessageBox({
        type: "info",
        title: "Session Diagnostics",
        message: "Current session health snapshot",
        detail: [
          `Partition: ${diagnostics.partition}`,
          `Normalized partition: ${diagnostics.normalizedPartition}`,
          `Cache size: ${formatBytes(diagnostics.cacheSizeBytes)}`,
          `Partition dir size: ${formatBytes(diagnostics.partitionDirSizeBytes)}`,
          `Partition file count: ${diagnostics.partitionFileCount}`,
          `Cookies count: ${diagnostics.cookiesCount}`,
          `Partition path exists: ${diagnostics.partitionPathExists ? "yes" : "no"}`,
          `Partition path: ${diagnostics.partitionPath}`,
        ].join("\n"),
      });
    })
  );

  handlers.add(
    window.electronIPCHandlers.onClearSessionCache(async () => {
      const partition = getActivePartitionId();
      if (!partition) return;

      const activeWebview = getActiveWebviewElement();
      if (activeWebview) {
        setPendingChatRestore(await captureActiveChatTitle(activeWebview));
      }
      await window.sessionTools.signalRefreshActivity();
      await window.sessionTools.clearCache(partition);
      activeWebview?.reload();

      await window.showMessageBox({
        type: "info",
        title: "Session Cache Cleared",
        message: "The active session cache was cleared and reloaded.",
      });
    })
  );

  handlers.add(
    window.electronIPCHandlers.onNewChat(() => {
      setShowNewChatDialog(true);
    })
  );

  return (
    <Dialog.Root
      open={canShowNewChatDialog()}
      onOpenChange={setShowNewChatDialog}
    >
      <Show when={canShowNewChatDialog()}>
        <NewChatDialog
          close={() => {
            setShowNewChatDialog(false);
          }}
        />
      </Show>
    </Dialog.Root>
  );
};

async function captureActiveChatTitle(webview: NonNullable<ReturnType<typeof getActiveWebviewElement>>) {
  try {
    const result = await webview.executeJavaScript(`
      (() => {
        const candidates = [
          'header [title]',
          'header span[title]',
          'header h1',
          'header h2',
          '[data-testid="conversation-info-header-chat-title"]',
          '[data-testid="conversation-header"] [dir="auto"]',
          'main header [dir="auto"]'
        ];

        for (const selector of candidates) {
          const element = document.querySelector(selector);
          const value = element?.getAttribute?.('title') || element?.textContent;
          if (value && value.trim()) {
            return value.trim();
          }
        }

        return null;
      })();
    `);

    return typeof result === "string" && result.trim() ? result.trim() : null;
  } catch {
    return null;
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export default TabsList;
