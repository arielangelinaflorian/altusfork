import { SetStoreFunction, createStore, unwrap } from "solid-js/store";
import {
  TabStoreDefaults,
  type TabStore,
  type Tab,
  getDefaultTab,
  PRIMARY_PARTITION_ID,
} from "./common";
import { WebviewTag } from "electron";
import { createEffect, createMemo, createSignal } from "solid-js";

const [tabStore, _updateTabStore] = createStore<TabStore>(TabStoreDefaults());
const [activeWebviewGeneration, setActiveWebviewGeneration] = createSignal(0);
let pendingChatRestore:
  | {
      chatTitle: string;
      capturedAt: number;
    }
  | null = null;

function getSingleSessionTab(store: TabStore): Tab {
  const selectedTab = store.tabs.find((tab) => tab.id === store.selectedTabId);
  return selectedTab ?? store.tabs[0] ?? getDefaultTab();
}

function normalizeToSingleSession(store: TabStore): TabStore {
  const primaryTab = getSingleSessionTab(store);

  return {
    tabs: [primaryTab],
    selectedTabId: primaryTab.id,
  };
}

/**
 * Used to make sure the rendered webviews are not moved when a tab is drag-n-dropped.
 */
export const stableTabArray = createMemo(() => {
  return tabStore.tabs.toSorted((a, b) =>
    a.id > b.id ? 1 : a.id < b.id ? -1 : 0
  );
});

createEffect(() => {
  for (const tab of tabStore.tabs) {
    const mediaPermsValue = tab.config.media;
    if (mediaPermsValue === undefined) {
      const defaultValue = getDefaultTab().config.media;
      updateAndSyncTabStore(
        "tabs",
        (t) => t.id === tab.id,
        "config",
        "media",
        defaultValue
      );
    }
  }
});

window.electronTabStore.getStore().then((store) => {
  const normalizedStore = normalizeToSingleSession(store);
  _updateTabStore(normalizedStore);
  syncElectronTabStore();
});

const updateAndSyncTabStore: SetStoreFunction<TabStore> = (
  ...args: unknown[]
) => {
  // @ts-expect-error Difficult to type, but works correctly
  _updateTabStore(...args);
  syncElectronTabStore();
};

function syncElectronTabStore() {
  const tabs = unwrap(tabStore.tabs);
  window.electronTabStore.set("tabs", tabs);

  const selectedTabId = unwrap(tabStore.selectedTabId);
  window.electronTabStore.set("selectedTabId", selectedTabId);
}

export function addTab(tab: Tab) {
  updateAndSyncTabStore("tabs", [tab]);
  updateAndSyncTabStore("selectedTabId", tab.id);
}

export function removeTab() {
  const replacementTab = getDefaultTab();
  updateAndSyncTabStore("tabs", [replacementTab]);
  updateAndSyncTabStore("selectedTabId", replacementTab.id);
}

export function moveTabToIndex(from: number, to: number) {
  if (from === to) return;
}

export function restoreTab() {
  return;
}

export function setTabActive(id: string) {
  updateAndSyncTabStore("selectedTabId", id);
}

export function getActiveWebviewElement() {
  const webviewElement = document.getElementById(
    `webview-${tabStore.selectedTabId}`
  ) as WebviewTag | null;
  return webviewElement;
}

export function getActivePartitionId() {
  return PRIMARY_PARTITION_ID;
}

export function recycleActiveWebview() {
  setActiveWebviewGeneration((value) => value + 1);
}

export function setPendingChatRestore(chatTitle: string | null) {
  if (!chatTitle) {
    pendingChatRestore = null;
    return;
  }

  pendingChatRestore = {
    chatTitle,
    capturedAt: Date.now(),
  };
}

export function consumePendingChatRestore() {
  const current = pendingChatRestore;
  pendingChatRestore = null;
  return current;
}

export { activeWebviewGeneration, tabStore, updateAndSyncTabStore };
