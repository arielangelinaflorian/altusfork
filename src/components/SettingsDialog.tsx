import { Dialog, TextField } from "@kobalte/core";
import { Accessor, Component, Setter, useContext } from "solid-js";
import CloseIcon from "../icons/CloseIcon";
import { getSettingValue, setSettingValue } from "../stores/settings/solid";
import { StyledSwitch } from "./StyledSwitch";
import StyledSelect from "./StyledSelect";
import { I18NContext } from "../i18n/solid";

const SettingsDialog: Component<{
  isOpen: Accessor<boolean>;
  setIsOpen: Setter<boolean>;
}> = (props) => {
  const { t } = useContext(I18NContext);

  return (
    <Dialog.Root open={props.isOpen()} onOpenChange={props.setIsOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/30" />
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          <Dialog.Content
            class="flex flex-col z-50 bg-zinc-800 text-white border rounded border-zinc-600 min-w-[30rem] px-3.5 pt-3 pb-2 max-w-[min(calc(100vw_-_1rem),32rem)] max-h-[70vh] overflow-hidden"
            onPointerDownOutside={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  "[data-custom-titlebar],[data-custom-titlebar-menu]"
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <div class="flex items-center justify-between mb-3">
              <Dialog.Title class="font-semibold">{t("Settings")}</Dialog.Title>
              <Dialog.CloseButton class="p-1 bg-zinc-700/50 hover:bg-zinc-600 rounded outline-none border border-transparent focus:border-zinc-300">
                <CloseIcon class="w-4 h-4" />
              </Dialog.CloseButton>
            </div>
            <Dialog.Description class="overflow-y-auto">
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("trayIcon")}
                  onChange={(checked) => setSettingValue("trayIcon", checked)}
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Icono en la bandeja</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Muestra Altus en el system tray para abrirlo y ocultarlo rapido.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("exitPrompt")}
                  onChange={(checked) => setSettingValue("exitPrompt", checked)}
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Confirmar al salir</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Pide confirmacion antes de cerrar Altus por completo.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("closeToTray")}
                  onChange={(checked) =>
                    setSettingValue("closeToTray", checked)
                  }
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Cerrar a la bandeja</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Al cerrar la ventana, Altus se oculta en la bandeja en vez de salir.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("autoRecycleOnBlur")}
                  onChange={(checked) =>
                    setSettingValue("autoRecycleOnBlur", checked)
                  }
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Auto refresco al salir de foco</div>
                    <div class="text-zinc-300 max-w-[34ch] leading-snug text-sm">
                      Si la sesion ya cumplio la edad minima, espera 1 minuto fuera de la app antes de refrescarla.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSelect
                  rootClass="items-start justify-between"
                  triggerClass="min-w-[15ch]"
                  multiple={false}
                  label={
                    <div class="flex flex-col gap-1.5">
                      <div class="font-semibold">Intervalo minimo de auto refresco</div>
                      <div class="text-zinc-300 max-w-[34ch] leading-snug text-sm">
                        Solo refresca cuando la sesion alcanza esta edad y la app esta desenfocada u oculta.
                      </div>
                    </div>
                  }
                  options={["off", "15", "30", "60"]}
                  value={getSettingValue("autoRecycleInTrayInterval")}
                  onChange={(value) => {
                    setSettingValue(
                      "autoRecycleInTrayInterval",
                      value as "off" | "15" | "30" | "60"
                    );
                  }}
                  valueRender={(state) => {
                    const value = state.selectedOption();
                    return value === "off" ? "Off" : `${value} min`;
                  }}
                  itemLabelRender={(item) =>
                    item.rawValue === "off" ? "Off" : `${item.rawValue} min`
                  }
                />
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("autoLaunch")}
                  onChange={(checked) => setSettingValue("autoLaunch", checked)}
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Iniciar con el sistema</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Abre Altus automaticamente cuando inicias sesion en el sistema.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("launchMinimized")}
                  onChange={(checked) =>
                    setSettingValue("launchMinimized", checked)
                  }
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Iniciar minimizado</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Abre Altus minimizado para entrar sin interrumpir tu flujo.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("rememberWindowSize")}
                  onChange={(checked) =>
                    setSettingValue("rememberWindowSize", checked)
                  }
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Recordar tamano de ventana</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Conserva el ultimo tamano de la ventana al volver a abrir la app.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <StyledSwitch
                  checked={getSettingValue("preventEnter")}
                  onChange={(checked) =>
                    setSettingValue("preventEnter", checked)
                  }
                  class="items-start"
                >
                  <div class="flex flex-col gap-1.5">
                    <div class="font-semibold">Evitar enviar con Enter</div>
                    <div class="text-zinc-300 max-w-[30ch] leading-snug text-sm">
                      Hace que Enter inserte salto de linea y evita enviar mensajes por accidente.
                    </div>
                  </div>
                </StyledSwitch>
              </div>
              <div class="py-2.5">
                <TextField.Root
                  class="flex gap-4 items-start"
                  value={getSettingValue("defaultDownloadDir")}
                  onChange={(value) =>
                    setSettingValue("defaultDownloadDir", value)
                  }
                >
                  <TextField.Label class="text-[0.95rem] leading-none">
                    <div class="flex flex-col gap-1.5">
                      <div class="font-semibold">Carpeta de descargas</div>
                      <div class="text-zinc-300 max-w-[40ch] leading-snug text-sm">
                        Define la carpeta por defecto para guardar archivos descargados.
                      </div>
                    </div>
                  </TextField.Label>
                  <TextField.Input
                    class="text-sm py-1.5 px-2.5 bg-zinc-700/50 border rounded border-zinc-600 outline-none focus:border-zinc-300 "
                    spellcheck={false}
                  />
                </TextField.Root>
              </div>
            </Dialog.Description>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SettingsDialog;
