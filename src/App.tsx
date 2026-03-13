import {
  For,
  type Component,
  createEffect,
  createSignal,
  createResource,
  onMount,
  onCleanup,
  Show,
} from "solid-js";
import {
  activeWebviewGeneration,
  recycleActiveWebview,
  stableTabArray,
  tabStore,
} from "./stores/tabs/solid";
import WebView from "./components/WebView";
import TabsList from "./components/TabsList";
import SettingsDialog from "./components/SettingsDialog";
import { getSettingValue } from "./stores/settings/solid";
import CustomTitlebar from "./components/CustomTitlebar";
import { I18NProvider } from "./i18n/solid";
import ThemeManagerDialog from "./components/ThemeManagerDialog";

const App: Component = () => {
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);
  const [isThemeManagerOpen, setIsThemeManagerOpen] = createSignal(false);
  const [menu, { refetch: refetchAppMenu }] = createResource(window.getAppMenu);

  const handlers = new Set<() => void>();
  onCleanup(() => {
    for (const cleanup of handlers) {
      cleanup();
    }
  });
  handlers.add(
    window.electronIPCHandlers.onOpenSettings(() => {
      setIsSettingsOpen(true);
    })
  );
  handlers.add(
    window.electronIPCHandlers.onOpenThemeManager(() => {
      setIsThemeManagerOpen(true);
    })
  );
  handlers.add(
    window.electronIPCHandlers.onReloadCustomTitleBar(refetchAppMenu)
  );

  onMount(() => {
    window.perfDebug.mark("renderer:app-mounted");

    let isWindowFocused = true;
    let isWindowHidden = false;
    let isDocumentVisible = document.visibilityState === "visible";
    let becameAwayAt: number | null = null;
    let autoRecycleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastRecycleAt = 0;
    let lastInteractionAt = Date.now();
    const awayGraceMs = 60_000;
    const recentInteractionGuardMs = 15_000;

    const markInteraction = () => {
      lastInteractionAt = Date.now();
    };

    const isUserPresent = () => {
      return isWindowFocused || isDocumentVisible || document.hasFocus();
    };

    const shouldBlockRecycle = () => {
      const now = Date.now();
      return isUserPresent() || now - lastInteractionAt < recentInteractionGuardMs;
    };

    const clearAutoRecycleTimer = () => {
      if (!autoRecycleTimer) return;
      clearTimeout(autoRecycleTimer);
      autoRecycleTimer = undefined;
    };

    const recycle = (reason: "blur-idle" | "tray-interval") => {
      const now = Date.now();
      if (now - lastRecycleAt < 30_000) return;
      if (shouldBlockRecycle()) return;

      lastRecycleAt = now;
      window.perfDebug.mark("renderer:auto-recycle", {
        reason,
        generation: activeWebviewGeneration(),
        isWindowFocused,
        isWindowHidden,
        isDocumentVisible,
        msSinceInteraction: now - lastInteractionAt,
      });
      void window.sessionTools.signalRefreshActivity();
      recycleActiveWebview();

      if (!shouldBlockRecycle()) {
        becameAwayAt = Date.now();
        scheduleAutoRecycleCheck();
      }
    };

    const getThresholdMs = () => {
      const configuredMinutes = getSettingValue("autoRecycleInTrayInterval");
      if (configuredMinutes === "off") return null;
      return parseInt(configuredMinutes, 10) * 60_000;
    };

    const scheduleAutoRecycleCheck = () => {
      clearAutoRecycleTimer();

      const thresholdMs = getThresholdMs();
      if (thresholdMs === null) return;
      if (shouldBlockRecycle() && !isWindowHidden) return;
      if (becameAwayAt === null) return;

      const now = Date.now();
      const nextEligibleAt = lastRecycleAt + thresholdMs;
      const awayGraceAt = becameAwayAt + awayGraceMs;
      const runAt = Math.max(nextEligibleAt, awayGraceAt);
      const delayMs = Math.max(runAt - now, 0);

      autoRecycleTimer = setTimeout(() => {
        if (shouldBlockRecycle() && !isWindowHidden) return;

        const reason = isWindowHidden ? "tray-interval" : "blur-idle";
        recycle(reason);
      }, delayMs);
    };

    window.windowActions.isBlurred().then((isBlurred) => {
      isWindowFocused = !isBlurred;
      if (!isWindowFocused) {
        becameAwayAt = Date.now();
      }
      scheduleAutoRecycleCheck();
    });

    window.windowActions.onBlurred(() => {
      isWindowFocused = false;
      if (becameAwayAt === null) {
        becameAwayAt = Date.now();
      }
      scheduleAutoRecycleCheck();
    });

    window.windowActions.onFocused(() => {
      isWindowFocused = true;
      markInteraction();
      if (!isWindowHidden) {
        becameAwayAt = null;
      }
      clearAutoRecycleTimer();
    });

    window.windowActions.onHidden(() => {
      isWindowHidden = true;
      if (becameAwayAt === null) {
        becameAwayAt = Date.now();
      }
      scheduleAutoRecycleCheck();
    });

    window.windowActions.onShown(() => {
      isWindowHidden = false;
      markInteraction();
      if (isWindowFocused) {
        becameAwayAt = null;
        clearAutoRecycleTimer();
        return;
      }
      scheduleAutoRecycleCheck();
    });

    const onVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible";
      if (isDocumentVisible) {
        markInteraction();
        if (isWindowFocused) {
          becameAwayAt = null;
          clearAutoRecycleTimer();
          return;
        }
      } else if (becameAwayAt === null) {
        becameAwayAt = Date.now();
      }

      scheduleAutoRecycleCheck();
    };

    const interactionEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "mousemove",
    ];

    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, markInteraction, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (!window.perfDebug.enabled || !("PerformanceObserver" in window)) {
      onCleanup(() => {
        clearAutoRecycleTimer();
        for (const eventName of interactionEvents) {
          window.removeEventListener(eventName, markInteraction);
        }
        document.removeEventListener("visibilitychange", onVisibilityChange);
      });
      return;
    }

    let observer: PerformanceObserver | undefined;

    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.perfDebug.mark("renderer:long-task", {
            duration: Math.round(entry.duration),
            name: entry.name,
            entryType: entry.entryType,
          });
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch (error) {
      window.perfDebug.mark("renderer:long-task-observer-unavailable", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    onCleanup(() => {
      clearAutoRecycleTimer();
      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, markInteraction);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer?.disconnect();
    });
  });

  createEffect(() => {
    window.perfDebug.mark("renderer:tabs-state", {
      totalTabs: stableTabArray().length,
      selectedTabId: tabStore.selectedTabId ?? null,
    });
  });

  createEffect(() => {
    window.perfDebug.mark("renderer:auto-recycle-settings", {
      onBlur: getSettingValue("autoRecycleOnBlur"),
      inTrayInterval: getSettingValue("autoRecycleInTrayInterval"),
    });
  });

  return (
    <I18NProvider>
      <div class="flex flex-col h-full">
        {getSettingValue("customTitlebar") && window.platform !== "darwin" && (
          <CustomTitlebar menu={menu} />
        )}
        <div class="h-full flex overflow-hidden flex-col">
          <TabsList />
          <For each={stableTabArray()}>
            {(tab) => (
              <div
                role="tabpanel"
                id={`tabpanel-${tab.id}`}
                class={`min-h-0 flex-grow text-white${
                  tabStore.selectedTabId !== tab.id ? " hidden" : ""
                }`}
              >
                <Show when={`${tab.id}:${activeWebviewGeneration()}`} keyed>
                  <WebView
                    tab={tab}
                    isActive={tabStore.selectedTabId === tab.id}
                  />
                </Show>
              </div>
            )}
          </For>
        </div>
        <SettingsDialog isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
        <ThemeManagerDialog
          isOpen={isThemeManagerOpen}
          setIsOpen={setIsThemeManagerOpen}
        />
      </div>
    </I18NProvider>
  );
};

export default App;
