import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  MenuItem,
  nativeImage,
  session,
  shell,
  Tray,
} from "electron";
import fs from "fs";
import path from "path";
import { electronTabStore } from "./stores/tabs/electron";
import {
  PRIMARY_SESSION_ID,
  TabStore,
} from "./stores/tabs/common";
import { electronThemeStore } from "./stores/themes/electron";
import { ThemeStore } from "./stores/themes/common";
import { electronSettingsStore } from "./stores/settings/electron";
import { languages } from "./i18n/langauges.config";
import os from "os";
import Store from "electron-store";
import { electronI18N } from "./i18n/electron";
import {
  DefaultSettingValues,
  SettingKey,
  Settings,
} from "./stores/settings/common";
import AutoLaunch from "auto-launch";
import electronDl from "electron-dl";
import contextMenu from "electron-context-menu";

const perfDebugEnabled = process.env.ALTUS_DEBUG_PERF === "1";
const perfDebugStartedAt = Date.now();
let trayHasNotifications = false;
let trayRefreshIndicatorTimeout: NodeJS.Timeout | undefined;

function perfLog(event: string, detail?: Record<string, unknown>) {
  if (!perfDebugEnabled) return;

  const elapsedMs = Date.now() - perfDebugStartedAt;
  if (detail) {
    console.log(`[perf +${elapsedMs}ms] ${event}`, detail);
  } else {
    console.log(`[perf +${elapsedMs}ms] ${event}`);
  }
}

const windowState = new Store<{
  width: number | null;
  height: number | null;
  x: number | null;
  y: number | null;
}>({
  name: "windowState",
  defaults: {
    width: null,
    height: null,
    x: null,
    y: null,
  },
});

function getSettingWithDefault<Key extends SettingKey>(
  setting: Key
): Settings[Key]["value"] {
  const defaultValue = DefaultSettingValues[setting];
  try {
    const value = electronSettingsStore.get(setting).value;
    return value ?? defaultValue;
  } catch (error) {
    console.error(error);
    return defaultValue;
  }
}

let tray: Tray | undefined;

const iconsPath = path.join(__dirname, "assets", "icons");

const mainIcon = nativeImage.createFromPath(
  path.join(iconsPath, process.platform === "win32" ? "icon.ico" : "icon.png")
);

const mainNotificationIcon = nativeImage.createFromPath(
  path.join(iconsPath, "icon-notification.png")
);

const trayIcon = nativeImage.createFromPath(
  path.join(iconsPath, process.platform === "win32" ? "icon.ico" : "tray.png")
);

const trayNotificationIcon = nativeImage.createFromPath(
  path.join(iconsPath, "tray-notification.png")
);

const trayRefreshingIcon = nativeImage.createFromDataURL(
  `data:image/svg+xml;base64,${Buffer.from(
    `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="13" fill="#1f2937"/>
  <path d="M21.5 10.2A8 8 0 0 0 8.7 13" fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M22.2 7.9v5.5h-5.5" fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10.5 21.8A8 8 0 0 0 23.3 19" fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M9.8 24.1v-5.5h5.5" fill="none" stroke="#f59e0b" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`.trim()
  ).toString("base64")}`
);

function confirmAndExit() {
  dialog
    .showMessageBox({
      type: "question",
      buttons: [electronI18N.t("Exit"), electronI18N.t("Cancel")],
      title: electronI18N.t("Exit"),
      message: electronI18N.t("Are you sure you want to exit?"),
    })
    .then(({ response }) => {
      if (response !== 0) {
        return;
      }
      if (tray) tray.destroy();
      app.exit(0);
    });
}

function quitApp() {
  const shouldPrompt = getSettingWithDefault("exitPrompt");
  if (shouldPrompt) confirmAndExit();
  else app.exit(0);
}

function createWindow() {
  perfLog("create-window:start");

  const useCustomTitlebar =
    process.platform !== "darwin" && getSettingWithDefault("customTitlebar");
  const rememberWindowSize = getSettingWithDefault("rememberWindowSize");
  const rememberWindowPosition = getSettingWithDefault(
    "rememberWindowPosition"
  );

  const mainWindow = new BrowserWindow({
    minWidth: 520,
    minHeight: 395,
    width: rememberWindowSize ? windowState.get("width") || 800 : undefined,
    height: rememberWindowSize ? windowState.get("height") || 600 : undefined,
    x: rememberWindowPosition ? windowState.get("x") || undefined : undefined,
    y: rememberWindowPosition ? windowState.get("y") || undefined : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
    },
    title: `Altus ${app.getVersion()}`,
    show: false,
    frame: !useCustomTitlebar,
    titleBarStyle: useCustomTitlebar ? "hidden" : "default",
    icon: mainIcon,
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  if (getSettingWithDefault("launchMinimized")) {
    mainWindow.minimize();
    mainWindow.blur();
  } else {
    mainWindow.once("ready-to-show", () => {
      perfLog("main-window:ready-to-show");
      mainWindow.show();
      mainWindow.focus();
    });
  }

  mainWindow.webContents.on("dom-ready", () => {
    perfLog("main-window:dom-ready");
  });

  mainWindow.webContents.on("did-finish-load", () => {
    perfLog("main-window:did-finish-load");
  });

  changeAutoHideMenuBar(mainWindow, getSettingWithDefault("autoHideMenuBar"));

  mainWindow.on("resize", () => {
    windowState.store = mainWindow.getBounds();
  });

  mainWindow.on("move", () => {
    windowState.store = mainWindow.getBounds();
  });

  mainWindow.on("blur", () => mainWindow.webContents.send("window-blurred"));
  mainWindow.on("focus", () => mainWindow.webContents.send("window-focused"));
  mainWindow.on("hide", () => mainWindow.webContents.send("window-hidden"));
  mainWindow.on("show", () => mainWindow.webContents.send("window-shown"));

  mainWindow.on("close", (event) => {
    const shouldCloseToTray = getSettingWithDefault("closeToTray");
    const shouldPrompt = getSettingWithDefault("exitPrompt");
    if (shouldCloseToTray) {
      event.preventDefault();
      mainWindow.hide();
    } else if (shouldPrompt) {
      event.preventDefault();
      confirmAndExit();
    } else if (tray) {
      tray.destroy();
    }
  });

  return mainWindow;
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.exit();
} else {
  app.on("second-instance", (_, argv) => {
    if (BrowserWindow.getAllWindows().length === 0) return;

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();

    if (argv.find((arg) => arg.includes("whatsapp"))) {
      handleWhatsappLinks(argv);
    }
  });

  app.on("ready", () => {
    perfLog("app:ready");

    const userAgentFallback = app.userAgentFallback;
    app.userAgentFallback = userAgentFallback.replace(
      /(Altus|Electron)([^\s]+\s)/g,
      ""
    );

    if (app.isPackaged) app.setAsDefaultProtocolClient("whatsapp");
    if (process.argv.some((arg) => arg.includes("whatsapp"))) {
      handleWhatsappLinks(process.argv);
    }

    pruneUnusedPartitions(
      electronTabStore.get("tabs"),
      app.getPath("userData")
    );

    const autoLauncher = new AutoLaunch({
      name: "Altus",
    });

    if (getSettingWithDefault("autoLaunch")) {
      autoLauncher.enable();
    } else {
      autoLauncher.disable();
    }

    const mainWindow = createWindow();

    contextMenu();

    const defaultDownloadDir = getSettingWithDefault("defaultDownloadDir");
    electronDl({
      saveAs: getSettingWithDefault("showSaveDialog"),
      directory: defaultDownloadDir ? defaultDownloadDir : undefined,
    });

    initializeI18N(mainWindow).then(() => {
      toggleTray(mainWindow, getSettingWithDefault("trayIcon"));
    });

    addIPCHandlers(mainWindow);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("web-contents-created", (_, webContents) => {
    if (webContents.getType() === "webview") {
      perfLog("webview:created", {
        id: webContents.id,
      });

      webContents.on("dom-ready", () => {
        perfLog("webview:dom-ready", {
          id: webContents.id,
          url: webContents.getURL(),
        });
      });

      webContents.on("did-start-loading", () => {
        perfLog("webview:did-start-loading", {
          id: webContents.id,
          url: webContents.getURL(),
        });
      });

      webContents.on("did-stop-loading", () => {
        perfLog("webview:did-stop-loading", {
          id: webContents.id,
          url: webContents.getURL(),
        });
      });

      webContents.on(
        "did-fail-load",
        (_event, errorCode, errorDescription, validatedURL) => {
          perfLog("webview:did-fail-load", {
            id: webContents.id,
            errorCode,
            errorDescription,
            validatedURL,
          });
        }
      );

      webContents.on("unresponsive", () => {
        perfLog("webview:unresponsive", {
          id: webContents.id,
          url: webContents.getURL(),
        });
      });

      webContents.on("responsive", () => {
        perfLog("webview:responsive", {
          id: webContents.id,
          url: webContents.getURL(),
        });
      });

      webContents.on("render-process-gone", (_event, details) => {
        perfLog("webview:render-process-gone", {
          id: webContents.id,
          reason: details.reason,
          exitCode: details.exitCode,
        });
      });

      contextMenu({
        window: {
          webContents: webContents,
          inspectElement: webContents.inspectElement.bind(webContents),
        } as unknown as BrowserWindow,
        showSaveImageAs: true,
        showInspectElement: true,
        append: (def, params, window) => [
          {
            label: "Bold",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "*");
            },
          },
          {
            label: "Italic",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "_");
            },
          },
          {
            label: "Strike",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "~");
            },
          },
          {
            label: "Monospaced",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "```");
            },
          },
        ],
      });
    }

    webContents.on("before-input-event", (event, input) => {
      if (getSettingWithDefault("preventEnter")) {
        if (input.key === "Enter" && !input.shift && !input.control) {
          webContents.sendInputEvent({
            keyCode: "Shift+Return",
            type: "keyDown",
          });
          event.preventDefault();
          return;
        }

        if (input.key === "Enter" && input.control) {
          try {
            webContents.executeJavaScript(
              `document.querySelector('button[aria-label="Send"]').click()`
            );
          } catch (error) {
            console.error(error);
          }
          event.preventDefault();
          return;
        }
      }
    });
  });
}

function handleWhatsappLinks(argv: string[]) {
  const arg = argv.find((arg) => arg.includes("whatsapp"));
  if (!arg) return;

  let url = "https://web.whatsapp.com/";

  if (arg.includes("send/?phone")) {
    url += arg.split("://")[1].replace("/", "");
  } else if (arg.includes("chat/?code")) {
    url += "accept?code=" + arg.split("=")[1];
  }

  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow.webContents.send("open-whatsapp-link", url);
}

function pruneUnusedPartitions(
  _tabs: TabStore["tabs"],
  userDataPath: string
) {
  const partitionsDirectoryPath = path.join(userDataPath, "Partitions");

  const doesPartitionsDirectoryExist = fs.existsSync(partitionsDirectoryPath);
  if (!doesPartitionsDirectoryExist) return;

  const partitions = fs.readdirSync(partitionsDirectoryPath);

  const activePartitionIds = new Set([PRIMARY_SESSION_ID]);

  partitions
    .filter((id) => !activePartitionIds.has(id.toLowerCase()))
    .forEach((id) => {
      const partitionPath = path.join(partitionsDirectoryPath, id);
      fs.rmSync(partitionPath, {
        recursive: true,
      });
    });
}

function changeAutoHideMenuBar(mainWindow: BrowserWindow, value: boolean) {
  mainWindow.setAutoHideMenuBar(value);
  mainWindow.setMenuBarVisibility(!value);
}

function toggleTray(mainWindow: BrowserWindow, enabled: boolean) {
  if (!enabled) {
    if (tray) tray.destroy();
    tray = undefined;
    return;
  }
  if (process.platform === "darwin") {
    app.dock?.setMenu(getLocalizedTrayMenu());
  }
  tray = new Tray(
    process.platform === "darwin"
      ? getCurrentTrayImage().resize({
          width: 16,
          height: 16,
        })
      : getCurrentTrayImage()
  );
  tray.setToolTip("Altus");
  tray.setContextMenu(getLocalizedTrayMenu());
  tray.on("click", () => {
    if (process.platform !== "darwin") {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

function getCurrentTrayImage() {
  return trayHasNotifications ? trayNotificationIcon : trayIcon;
}

function restoreTrayImage() {
  if (!tray) return;
  tray.setImage(
    process.platform === "darwin"
      ? getCurrentTrayImage().resize({ width: 16, height: 16 })
      : getCurrentTrayImage()
  );
}

function pulseTrayRefreshIndicator() {
  if (!tray) return;

  if (trayRefreshIndicatorTimeout) {
    clearTimeout(trayRefreshIndicatorTimeout);
  }

  tray.setImage(
    process.platform === "darwin"
      ? trayRefreshingIcon.resize({ width: 16, height: 16 })
      : trayRefreshingIcon
  );

  trayRefreshIndicatorTimeout = setTimeout(() => {
    restoreTrayImage();
  }, 2200);
}

type PartitionID = string;
/**
 * For every permission that we want to handle, we keep track of the partitions
 * where it is enabled.
 */
const sessionPermissions = {
  notifications: new Set<PartitionID>(),
  media: new Set<PartitionID>(),
};
type SessionPermissionKey = keyof typeof sessionPermissions;
const HandledPermissions = Object.keys(sessionPermissions);

function normalizePartitionId(partitionId: string) {
  return partitionId.replace(/^persist:/, "");
}

function getPartitionPath(partitionId: string) {
  return path.join(
    app.getPath("userData"),
    "Partitions",
    normalizePartitionId(partitionId)
  );
}

function getDirectoryStats(dirPath: string): {
  sizeBytes: number;
  fileCount: number;
} {
  if (!fs.existsSync(dirPath)) {
    return { sizeBytes: 0, fileCount: 0 };
  }

  let sizeBytes = 0;
  let fileCount = 0;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const childStats = getDirectoryStats(entryPath);
      sizeBytes += childStats.sizeBytes;
      fileCount += childStats.fileCount;
      continue;
    }

    if (entry.isFile()) {
      const stat = fs.statSync(entryPath);
      sizeBytes += stat.size;
      fileCount += 1;
    }
  }

  return { sizeBytes, fileCount };
}

function addIPCHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("get-whatsapp-preload-path", () => {
    // @ts-expect-error ImportMeta works correctly
    return import.meta.url.replace("main.js", "whatsapp.preload.js");
  });

  ipcMain.handle("settings-store-get", () => {
    return electronSettingsStore.store;
  });

  ipcMain.handle(
    "settings-store-set",
    (_event, key: SettingKey, value: unknown) => {
      if (value === undefined) return electronSettingsStore.delete(key);
      if (key === "autoHideMenuBar") {
        changeAutoHideMenuBar(mainWindow, value as boolean);
      } else if (key === "trayIcon") {
        toggleTray(mainWindow, value as boolean);
      }
      return electronSettingsStore.set(key, { value });
    }
  );

  ipcMain.handle("tab-store-get", () => {
    return electronTabStore.store;
  });

  ipcMain.handle(
    "tab-store-set",
    (_event, key: keyof TabStore, value: unknown) => {
      if (value === undefined) return electronTabStore.delete(key);
      return electronTabStore.set(key, value);
    }
  );

  ipcMain.handle("theme-store-get", () => {
    return electronThemeStore.store;
  });

  ipcMain.handle(
    "theme-store-set",
    (_event, key: keyof ThemeStore, value: unknown) => {
      if (value === undefined) return electronThemeStore.delete(key);
      return electronThemeStore.set(key, value);
    }
  );

  ipcMain.handle("init-permission-handler", (_, partitionId: string) => {
    session
      .fromPartition(partitionId)
      .setPermissionRequestHandler((_, permission, callback) => {
        if (!HandledPermissions.includes(permission)) {
          callback(false);
          return;
        }
        const isEnabled =
          sessionPermissions[permission as SessionPermissionKey].has(
            partitionId
          );
        callback(isEnabled);
      });
  });

  ipcMain.handle(
    "toggle-notifications",
    (_event, enabled: boolean, partitionId: string) => {
      if (enabled) {
        sessionPermissions.notifications.add(partitionId);
      } else {
        sessionPermissions.notifications.delete(partitionId);
      }
    }
  );

  ipcMain.handle(
    "toggle-media-permission",
    (_event, enabled: boolean, partitionId: string) => {
      if (enabled) {
        sessionPermissions.media.add(partitionId);
      } else {
        sessionPermissions.media.delete(partitionId);
      }
    }
  );

  ipcMain.handle("get-session-diagnostics", async (_event, partitionId: string) => {
    const currentSession = session.fromPartition(partitionId);
    const partitionPath = getPartitionPath(partitionId);
    const directoryStats = getDirectoryStats(partitionPath);
    const cookiesCount = (await currentSession.cookies.get({})).length;
    const cacheSizeBytes = await currentSession.getCacheSize();

    return {
      partition: partitionId,
      normalizedPartition: normalizePartitionId(partitionId),
      cacheSizeBytes,
      partitionDirSizeBytes: directoryStats.sizeBytes,
      partitionFileCount: directoryStats.fileCount,
      cookiesCount,
      partitionPath,
      partitionPathExists: fs.existsSync(partitionPath),
    };
  });

  ipcMain.handle("clear-session-cache", async (_event, partitionId: string) => {
    const currentSession = session.fromPartition(partitionId);
    await currentSession.clearCache();
    perfLog("session:cache-cleared", {
      partitionId,
    });
  });

  ipcMain.handle("signal-session-refresh-activity", () => {
    pulseTrayRefreshIndicator();
  });

  ipcMain.on("open-link", (_event, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle(
    "show-message-box",
    (_event, options: Electron.MessageBoxOptions) => {
      return dialog.showMessageBox(options);
    }
  );

  ipcMain.handle("get-app-menu", () => {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;
    const cloneableMenu = getCloneableMenu(menu);
    return cloneableMenu;
  });

  ipcMain.handle("menu-item-click", (_event, id: string) => {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;
    const item = menu.getMenuItemById(id);
    if (!item) return;
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) return;
    const focusedWebContents = focusedWindow.webContents;
    item.click(undefined, focusedWindow, focusedWebContents);
  });

  ipcMain.handle("minimize-window", () => {
    mainWindow.minimize();
  });

  ipcMain.handle("maximize-window", () => {
    mainWindow.maximize();
  });

  ipcMain.handle("restore-window", () => {
    mainWindow.restore();
  });

  ipcMain.handle("close-window", () => {
    mainWindow.close();
  });

  ipcMain.handle("is-maximized", () => {
    return mainWindow.isMaximized();
  });

  ipcMain.handle("is-blurred", () => {
    return !mainWindow.isFocused();
  });

  ipcMain.on("zoom", ({ sender }, type) => {
    const currentZoomFactor = sender.getZoomFactor();
    switch (type) {
      case "in":
        sender.setZoomFactor(currentZoomFactor + 0.1);
        break;
      case "out":
        sender.setZoomFactor(currentZoomFactor - 0.1);
        break;
      default:
        sender.setZoomFactor(1);
        break;
    }
  });

  ipcMain.on("message-count", (_, detail) => {
    mainWindow.webContents.send("message-count", detail);
    if (!getSettingWithDefault("notificationBadge")) {
      return;
    }
    const messageCount = detail.messageCount;
    if (messageCount) {
      switch (process.platform) {
        case "darwin":
          app.dock?.setBadge("·");
          break;
        default:
          trayHasNotifications = true;
          if (tray) tray.setImage(trayNotificationIcon);
          mainWindow.setOverlayIcon(mainNotificationIcon, "Notification badge");
          break;
      }
    } else {
      switch (process.platform) {
        case "darwin":
          app.dock?.setBadge("");
          break;
        default:
          trayHasNotifications = false;
          if (tray) tray.setImage(trayIcon);
          mainWindow.setOverlayIcon(null, "Notification badge empty");
          break;
      }
    }
  });

  ipcMain.on(
    "perf-mark",
    (
      _,
      payload: {
        event: string;
        detail?: Record<string, unknown>;
      }
    ) => {
      perfLog(payload.event, payload.detail);
    }
  );
}

type CloneableMenuItem = Omit<MenuItem, "menu" | "submenu" | "click"> & {
  submenu?: CloneableMenu;
};
export type CloneableMenu = CloneableMenuItem[];

function getCloneableMenu(menu: Menu) {
  return menu.items.map(getCloneableMenuItem);
}

function getCloneableMenuItem(item: MenuItem): CloneableMenuItem {
  const cloneableItem = { ...item } as CloneableMenuItem & {
    menu?: Menu;
    submenu?: Menu;
    click?: () => void;
  };
  delete cloneableItem["menu"];
  delete cloneableItem["click"];
  if (cloneableItem.submenu) {
    (cloneableItem as CloneableMenuItem).submenu = getCloneableMenu(
      cloneableItem.submenu as Menu
    );
  }
  cloneableItem.checked = item.checked;
  return cloneableItem;
}

async function initializeI18N(mainWindow: BrowserWindow) {
  electronI18N.setLanguageChangeCallback((language) => {
    electronSettingsStore.set("language", {
      value: language,
    });
  });

  electronI18N.setLanguageLoadedCallback(() => {
    const menu = getLocalizedMainMenu();
    Menu.setApplicationMenu(menu);
    mainWindow.webContents.send("reload-custom-title-bar");
    mainWindow.webContents.send("reload-translations");
  });

  try {
    await electronI18N.initialize();

    const initialLanguage = getSettingWithDefault("language");
    electronI18N.setLanguage(initialLanguage);
  } catch (error) {
    console.error(error);
  }
}

const versionInfo = `Altus: ${app.getVersion()}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
V8: ${process.versions.v8}
OS: ${os.type()} ${os.arch()} ${os.release()}`;

const aboutDialogText = `With help from: MarceloZapatta, Dafnik, dmcdo, insign, srevinsaju, maicol07, ngmoviedo.

Thanks to: vednoc for Dark WhatsApp theme.
  
${versionInfo}`;

function getLocalizedMainMenu() {
  const menuTemplate: (
    | Electron.MenuItemConstructorOptions
    | Electron.MenuItem
  )[] = [
    {
      label: electronI18N.t("&File"),
      submenu: [
        {
          label: electronI18N.t("Start &New Chat"),
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("new-chat");
          },
          id: "start-new-chat",
        },
        {
          label: electronI18N.t("Force &Reload"),
          role: "forceReload",
          id: "force-reload",
        },
        {
          label: electronI18N.t("&Quit"),
          id: "quit",
          accelerator: "CmdOrCtrl+Q",
          acceleratorWorksWhenHidden: false,
          click: quitApp,
        },
      ],
    },
    {
      label: electronI18N.t("&Edit"),
      submenu: [
        {
          label: electronI18N.t("Undo"),
          role: "undo",
          id: "undo",
        },
        {
          label: electronI18N.t("Redo"),
          role: "redo",
          id: "redo",
        },
        {
          type: "separator",
        },
        {
          label: electronI18N.t("Cut"),
          role: "cut",
          id: "cut",
        },
        {
          label: electronI18N.t("Copy"),
          role: "copy",
          id: "copy",
        },
        {
          label: electronI18N.t("Paste"),
          role: "paste",
          id: "paste",
        },
        {
          label: electronI18N.t("Select All"),
          role: "selectAll",
          id: "select-all",
        },
        {
          type: "separator",
        },
        {
          label: electronI18N.t("Language"),
          submenu: languages.map((lang) => {
            return {
              label: electronI18N.t(lang),
              type: "radio",
              checked: electronI18N.getLanguage() === lang,
              click: () => {
                electronI18N.setLanguage(lang);
              },
              id: lang,
            };
          }),
        },
      ],
    },
    {
      label: "Session",
      submenu: [
        {
          label: "Reload Session",
          accelerator: "CmdOrCtrl+Alt+R",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("reload-active-session");
          },
          id: "reload-active-session",
        },
        {
          label: "Recycle Webview",
          accelerator: "CmdOrCtrl+Shift+R",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("recycle-active-session");
          },
          id: "recycle-active-session",
        },
        {
          label: "Clear Session Cache",
          accelerator: "CmdOrCtrl+Shift+Backspace",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("clear-session-cache");
          },
          id: "clear-session-cache",
        },
        {
          label: "Show Session Diagnostics",
          accelerator: "CmdOrCtrl+Alt+I",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("show-session-diagnostics");
          },
          id: "show-session-diagnostics",
        },
        {
          label: "Open Webview DevTools",
          accelerator: "CmdOrCtrl+Shift+D",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("open-tab-devtools");
          },
          id: "open-tab-devtools",
        },
      ],
    },
    {
      label: electronI18N.t("Themes"),
      submenu: [
        {
          label: electronI18N.t("Theme Manager"),
          accelerator: "Alt+T",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("open-theme-manager");
          },
          id: "open-theme-manager",
        },
      ],
    },
    {
      label: electronI18N.t("&Settings"),
      submenu: [
        {
          label: electronI18N.t("&Settings"),
          accelerator: "Ctrl+,",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("open-settings");
          },
          id: "open-settings",
        },
      ],
    },
    {
      label: electronI18N.t("&Help"),
      submenu: [
        {
          label: electronI18N.t("&About"),
          click() {
            dialog
              .showMessageBox({
                type: "info",
                title: `Altus v${app.getVersion()}`,
                message: `Made by Aman Harwara.`,
                detail: aboutDialogText,
                icon: mainIcon,
                buttons: ["Copy Version Info", "OK"],
              })
              .then((res) => {
                const buttonClicked = res.response;
                switch (buttonClicked) {
                  case 0:
                    clipboard.write({
                      text: versionInfo,
                    });
                    break;
                }
              })
              .catch((err) => {
                console.error(err);
              });
          },
          id: "about",
        },
        {
          label: electronI18N.t("Check For &Updates"),
          accelerator: "CmdOrCtrl+Shift+U",
          click() {
            dialog
              .showMessageBox({
                type: "question",
                message: "Check for Updates?",
                detail: `Current version: v${app.getVersion()}`,
                buttons: ["Yes", "No"],
              })
              .then((res) => {
                const buttonClicked = res.response;
                if (buttonClicked === 0) {
                  // checkUpdates().catch((err) => console.error(err));
                }
              })
              .catch((err) => console.error(err));
          },
          id: "check-for-updates",
        },
        {
          label: electronI18N.t("Links"),
          submenu: [
            {
              label: electronI18N.t("Report Bugs/Issues"),
              click: () => {
                shell.openExternal(
                  "https://gitlab.com/amanharwara/altus/-/issues"
                );
              },
              id: "report-bugs-issues",
            },
            {
              label: electronI18N.t("Website"),
              click: () => {
                shell.openExternal("https://amanharwara.com");
              },
              id: "website",
            },
            {
              label: electronI18N.t("Repository"),
              click: () => {
                shell.openExternal("https://www.github.com/amanharwara/altus");
              },
              id: "repository",
            },
          ],
        },
        {
          label: electronI18N.t("Open &DevTools"),
          role: "toggleDevTools",
          id: "toggle-dev-tools",
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(menuTemplate);
}

function getLocalizedTrayMenu() {
  const menuTemplate: (
    | Electron.MenuItemConstructorOptions
    | Electron.MenuItem
  )[] = [
    {
      label: BrowserWindow.getAllWindows()[0]?.isVisible()
        ? "Ocultar Altus"
        : "Mostrar Altus",
      click() {
        const window = BrowserWindow.getAllWindows()[0];
        if (!window) return;
        if (window.isVisible()) {
          window.hide();
        } else {
          window.show();
          window.focus();
        }
      },
    },
    {
      label: "Refrescar sesion",
      accelerator: "CmdOrCtrl+Alt+R",
      click() {
        const window = BrowserWindow.getAllWindows()[0];
        if (window) window.webContents.send("reload-active-session");
      },
    },
    {
      label: "Salir",
      click: quitApp,
    },
  ];

  return Menu.buildFromTemplate(menuTemplate);
}
