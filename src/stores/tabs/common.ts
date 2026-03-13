export const PRIMARY_SESSION_ID = "primary";
export const PRIMARY_PARTITION_ID = `persist:${PRIMARY_SESSION_ID}`;

export type Tab = {
  id: string;
  name: string;
  messageCount?: number;
  config: {
    theme: string;
    media: boolean;
    notifications: boolean;
    sound: boolean;
    color: string | null;
    spellChecker: boolean;
  };
};

export type TabStore = {
  tabs: Tab[];
  selectedTabId: string | undefined;
};

export const getDefaultTab = (): Tab => ({
  id: PRIMARY_SESSION_ID,
  name: "Principal",
  messageCount: 0,
  config: {
    theme: "dark",
    notifications: true,
    media: true,
    sound: true,
    color: null,
    spellChecker: true,
  },
});

export const TabStoreDefaults = (): TabStore => ({
  tabs: [],
  selectedTabId: undefined,
});

export type ElectronTabStoreIpcApi = {
  getStore: () => Promise<TabStore>;
  set: <T extends keyof TabStore>(key: T, value: TabStore[T]) => Promise<void>;
};
