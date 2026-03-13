import {
  type Component,
  onMount,
  onCleanup,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import {
  PRIMARY_PARTITION_ID,
  type Tab,
} from "../stores/tabs/common";
import { WebviewTag } from "electron";
import { themeStore } from "../stores/themes/solid";
import { unwrap } from "solid-js/store";
import { consumePendingChatRestore } from "../stores/tabs/solid";

const WebView: Component<{ tab: Tab; isActive: boolean }> = (props) => {
  let webviewRef: WebviewTag | undefined;
  const [didStopLoading, setDidStopLoading] = createSignal(false);

  const track = (event: string, detail?: Record<string, unknown>) => {
    window.perfDebug.mark(event, {
      tabId: props.tab.id,
      partition: PRIMARY_PARTITION_ID,
      ...detail,
    });
  };

  const selectedTheme = createMemo(() => {
    return unwrap(
      themeStore.themes.find((theme) => theme.id === props.tab.config.theme)
    );
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    webviewRef.send("set-theme", selectedTheme());
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    webviewRef.setAudioMuted(!props.tab.config.sound);
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    window.initPermissionHandler(PRIMARY_PARTITION_ID);
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    window.toggleNotifications(
      props.tab.config.notifications,
      PRIMARY_PARTITION_ID
    );
    window.toggleMediaPermission(
      props.tab.config.media,
      PRIMARY_PARTITION_ID
    );
  });

  createEffect(() => {
    if (!webviewRef) return;
    if (!didStopLoading()) return;

    webviewRef.send("set-id", props.tab.id);
  });

  createEffect(() => {
    track("renderer:webview-visibility", {
      isActive: props.isActive,
      mountedWebviews: document.querySelectorAll("webview").length,
    });
  });

  onMount(() => {
    const webview = webviewRef;

    if (!webview) {
      return;
    }

    track("renderer:webview-mounted", {
      mountedWebviews: document.querySelectorAll("webview").length,
    });

    const onDidStopLoading = () => {
      setDidStopLoading(false);
      setDidStopLoading(true);
      track("renderer:webview-did-stop-loading", {
        src: webview.src,
      });

      const pendingRestore = consumePendingChatRestore();
      if (pendingRestore?.chatTitle) {
        queueMicrotask(() => {
          restoreChatByTitle(webview, pendingRestore.chatTitle, track);
        });
      }
    };

    const onDidStartLoading = () => {
      track("renderer:webview-did-start-loading", {
        src: webview.src,
      });
    };

    const onDomReady = () => {
      track("renderer:webview-dom-ready", {
        src: webview.src,
      });
    };

    const onFocus = () => {
      const anyOpenTitlebarMenu = document.querySelector(
        "[data-custom-titlebar-menu] > [data-expanded]"
      );
      if (!anyOpenTitlebarMenu) return;
      anyOpenTitlebarMenu.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        })
      );
    };

    webview.addEventListener("did-stop-loading", onDidStopLoading);
    webview.addEventListener("did-start-loading", onDidStartLoading);
    webview.addEventListener("dom-ready", onDomReady);
    webview.addEventListener("focus", onFocus);

    onCleanup(() => {
      webview.removeEventListener("did-stop-loading", onDidStopLoading);
      webview.removeEventListener("did-start-loading", onDidStartLoading);
      webview.removeEventListener("dom-ready", onDomReady);
      webview.removeEventListener("focus", onFocus);

      track("renderer:webview-unmounted", {
        mountedWebviews: document.querySelectorAll("webview").length,
      });
    });
  });

  return (
    <webview
      ref={webviewRef}
      class="w-full h-full"
      id={`webview-${props.tab.id}`}
      src="https://web.whatsapp.com"
      partition={PRIMARY_PARTITION_ID}
      preload={window.whatsappPreloadPath}
      webpreferences={`spellcheck=${props.tab.config.spellChecker}`}
    />
  );
};

function restoreChatByTitle(
  webview: WebviewTag,
  chatTitle: string,
  track: (event: string, detail?: Record<string, unknown>) => void
) {
  const escapedTitle = JSON.stringify(chatTitle);

  void webview
    .executeJavaScript(`
      (() => {
        const normalizedTarget = ${escapedTitle}.toLowerCase().trim();
        const selectors = [
          '[title]',
          '[aria-label]',
          '[data-testid="cell-frame-title"]',
          '[data-testid="cell-frame-container"] [dir="auto"]',
          '[role="listitem"] span',
          '[role="gridcell"] span'
        ];

        const normalize = (value) => (value || '').toLowerCase().trim();

        const clickElement = (element) => {
          const clickable =
            element.closest('[role="listitem"]') ||
            element.closest('[role="button"]') ||
            element.closest('[tabindex]') ||
            element;
          clickable.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          clickable.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          clickable.click();
          return true;
        };

        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const element of elements) {
            const title = normalize(element.getAttribute?.('title'));
            const aria = normalize(element.getAttribute?.('aria-label'));
            const text = normalize(element.textContent);
            if (
              title === normalizedTarget ||
              aria === normalizedTarget ||
              text === normalizedTarget
            ) {
              return clickElement(element);
            }
          }
        }

        return false;
      })();
    `)
    .then((restored) => {
      track("renderer:webview-chat-restore", {
        chatTitle,
        restored: Boolean(restored),
      });
    })
    .catch((error) => {
      track("renderer:webview-chat-restore-error", {
        chatTitle,
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

export default WebView;
