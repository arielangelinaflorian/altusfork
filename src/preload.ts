import {
  type MessageBoxOptions,
  contextBridge,
  ipcRenderer,
  type IpcRendererEvent,
} from "electron";
import { ElectronTabStoreIpcApi } from "./stores/tabs/common";
import { ElectronThemeStoreIpcApi } from "./stores/themes/common";
import { ElectronSettingsStoreIpcApi } from "./stores/settings/common";
import type { ElectronIPCHandlers } from "./ipcHandlersType";

const perfDebugEnabled = process.env.ALTUS_DEBUG_PERF === "1";

ipcRenderer.invoke("get-whatsapp-preload-path").then((preloadPath) => {
  contextBridge.exposeInMainWorld("whatsappPreloadPath", preloadPath);
});

const electronTabStoreIpcApi: ElectronTabStoreIpcApi = {
  getStore: async () => await ipcRenderer.invoke("tab-store-get"),
  set: async (key, value) =>
    await ipcRenderer.invoke("tab-store-set", key, value),
};

const electronThemeStoreIpcApi: ElectronThemeStoreIpcApi = {
  getStore: async () => await ipcRenderer.invoke("theme-store-get"),
  setThemes: async (themes) =>
    ipcRenderer.invoke("theme-store-set", "themes", themes),
};

const electronSettingsStoreIpcApi: ElectronSettingsStoreIpcApi = {
  getStore: async () => await ipcRenderer.invoke("settings-store-get"),
  setSetting: async (key, value) =>
    ipcRenderer.invoke("settings-store-set", key, value),
};

const initPermissionHandler = async (partition: string) => {
  await ipcRenderer.invoke("init-permission-handler", partition);
};

const toggleNotifications = async (enabled: boolean, partition: string) => {
  await ipcRenderer.invoke("toggle-notifications", enabled, partition);
};

const toggleMediaPermission = async (enabled: boolean, partition: string) => {
  await ipcRenderer.invoke("toggle-media-permission", enabled, partition);
};

const sessionTools = {
  getDiagnostics: async (partition: string) =>
    ipcRenderer.invoke("get-session-diagnostics", partition),
  clearCache: async (partition: string) =>
    ipcRenderer.invoke("clear-session-cache", partition),
  signalRefreshActivity: async () =>
    ipcRenderer.invoke("signal-session-refresh-activity"),
};

contextBridge.exposeInMainWorld("electronTabStore", electronTabStoreIpcApi);
contextBridge.exposeInMainWorld("electronThemeStore", electronThemeStoreIpcApi);
contextBridge.exposeInMainWorld(
  "electronSettingsStore",
  electronSettingsStoreIpcApi
);
contextBridge.exposeInMainWorld("initPermissionHandler", initPermissionHandler);
contextBridge.exposeInMainWorld("toggleNotifications", toggleNotifications);
contextBridge.exposeInMainWorld("toggleMediaPermission", toggleMediaPermission);
contextBridge.exposeInMainWorld("sessionTools", sessionTools);

const ipcHandlers: ElectronIPCHandlers = {
  onOpenSettings: (callback) => {
    ipcRenderer.on("open-settings", callback);
    return () => ipcRenderer.off("open-settings", callback);
  },
  onOpenTabDevTools: (callback) => {
    ipcRenderer.on("open-tab-devtools", callback);
    return () => ipcRenderer.off("open-tab-devtools", callback);
  },
  onReloadActiveSession: (callback) => {
    ipcRenderer.on("reload-active-session", callback);
    return () => ipcRenderer.off("reload-active-session", callback);
  },
  onRecycleActiveSession: (callback) => {
    ipcRenderer.on("recycle-active-session", callback);
    return () => ipcRenderer.off("recycle-active-session", callback);
  },
  onShowSessionDiagnostics: (callback) => {
    ipcRenderer.on("show-session-diagnostics", callback);
    return () => ipcRenderer.off("show-session-diagnostics", callback);
  },
  onClearSessionCache: (callback) => {
    ipcRenderer.on("clear-session-cache", callback);
    return () => ipcRenderer.off("clear-session-cache", callback);
  },
  onOpenWhatsappLink: (callback) => {
    const handler = (_: IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on("open-whatsapp-link", handler);
    return () => ipcRenderer.off("open-whatsapp-link", handler);
  },
  onReloadCustomTitleBar: (callback) => {
    ipcRenderer.on("reload-custom-title-bar", callback);
    return () => ipcRenderer.off("reload-custom-title-bar", callback);
  },
  onReloadTranslations: (callback) => {
    ipcRenderer.on("reload-translations", callback);
    return () => ipcRenderer.off("reload-translations", callback);
  },
  onNewChat: (callback) => {
    ipcRenderer.on("new-chat", callback);
    return () => ipcRenderer.off("new-chat", callback);
  },
  onOpenThemeManager: (callback) => {
    ipcRenderer.on("open-theme-manager", callback);
    return () => ipcRenderer.off("open-theme-manager", callback);
  },
  onMessageCount: (callback) => {
    const handler = (
      _: IpcRendererEvent,
      count: { messageCount: number; tabId: string }
    ) => callback(count);
    ipcRenderer.on("message-count", handler);
    return () => ipcRenderer.off("message-count", handler);
  },
};

contextBridge.exposeInMainWorld("electronIPCHandlers", ipcHandlers);

contextBridge.exposeInMainWorld(
  "showMessageBox",
  (options: MessageBoxOptions) => {
    return ipcRenderer.invoke("show-message-box", options);
  }
);

contextBridge.exposeInMainWorld("getAppMenu", () =>
  ipcRenderer.invoke("get-app-menu")
);

contextBridge.exposeInMainWorld("i18n", {
  getTranslations: () => ipcRenderer.invoke("get-translations"),
  keyMissing: (key: string) => ipcRenderer.invoke("key-missing", key),
});

contextBridge.exposeInMainWorld("clickMenuItem", (id: string) =>
  ipcRenderer.invoke("menu-item-click", id)
);

contextBridge.exposeInMainWorld("platform", process.platform);
contextBridge.exposeInMainWorld("perfDebug", {
  enabled: perfDebugEnabled,
  mark: (event: string, detail?: Record<string, unknown>) => {
    if (!perfDebugEnabled) return;
    ipcRenderer.send("perf-mark", { event, detail });
  },
});

if (perfDebugEnabled) {
  window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.send("perf-mark", {
      event: "renderer:dom-content-loaded",
    });
  });
}

contextBridge.exposeInMainWorld("windowActions", {
  minimize: () => ipcRenderer.invoke("minimize-window"),
  maximize: () => ipcRenderer.invoke("maximize-window"),
  restore: () => ipcRenderer.invoke("restore-window"),
  close: () => ipcRenderer.invoke("close-window"),
  isMaximized: () => ipcRenderer.invoke("is-maximized"),
  isBlurred: () => ipcRenderer.invoke("is-blurred"),
  onBlurred: (callback: () => void) =>
    ipcRenderer.on("window-blurred", callback),
  onFocused: (callback: () => void) =>
    ipcRenderer.on("window-focused", callback),
  onHidden: (callback: () => void) => ipcRenderer.on("window-hidden", callback),
  onShown: (callback: () => void) => ipcRenderer.on("window-shown", callback),
});
