export type ElectronIPCHandlers = {
  onOpenSettings: (callback: () => void) => () => void;
  onOpenTabDevTools: (callback: () => void) => () => void;
  onReloadActiveSession: (callback: () => void) => () => void;
  onRecycleActiveSession: (callback: () => void) => () => void;
  onShowSessionDiagnostics: (callback: () => void) => () => void;
  onClearSessionCache: (callback: () => void) => () => void;
  onOpenWhatsappLink: (callback: (url: string) => void) => () => void;
  onReloadCustomTitleBar: (callback: () => void) => () => void;
  onReloadTranslations: (callback: () => void) => () => void;
  onNewChat: (callback: () => void) => () => void;
  onOpenThemeManager: (callback: () => void) => () => void;
  onMessageCount: (
    callback: (detail: { messageCount: number; tabId: string }) => void
  ) => () => void;
};
