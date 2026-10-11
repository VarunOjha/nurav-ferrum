// Shell of spike S1: three tab buttons. The tabs themselves are separate child web views.
import { invoke } from "@tauri-apps/api/core";

const info = document.getElementById("info") as HTMLSpanElement;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button[data-tab]"));

function mark(n: number): void {
  for (const b of buttons) b.classList.toggle("active", Number(b.dataset.tab) === n);
}

for (const b of buttons) {
  b.addEventListener("click", async () => {
    const n = Number(b.dataset.tab);
    await invoke("show_tab", { n });
    mark(n);
  });
}

async function start(): Promise<void> {
  const mode = await invoke<string>("spike_mode");
  const command = mode === "sync" ? "create_tabs_sync" : "create_tabs";
  info.textContent = `Mode ${mode}: creating tabs with ${command}…`;
  const labels = await invoke<string[]>(command);
  mark(1);
  info.textContent =
    mode === "manual"
      ? `${labels.length} tabs ready. Try: Alt+Tab away and back, then type in the text box; resize the window; Ctrl+A / Ctrl+C / Ctrl+V / Ctrl+Z in the text box.`
      : `Mode ${mode}: ${labels.length} tabs created; checks running, the window closes by itself.`;
}

start().catch((e: unknown) => {
  info.textContent = `Error: ${String(e)}`;
});
