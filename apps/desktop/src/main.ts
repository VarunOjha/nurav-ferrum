// Ferrum shell (trusted web view, label "shell"). P2: toolbar; navigation is wired in p2.6-p2.8.
import { invoke } from "@tauri-apps/api/core";

const statusEl = document.getElementById("status") as HTMLSpanElement;
const address = document.getElementById("address") as HTMLInputElement;
const form = document.getElementById("address-form") as HTMLFormElement;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  statusEl.textContent = "Navigation arrives in a later step of phase 2.";
});

// The shell is the only web view allowed to use the app bridge (capability shell.json, p2.3).
invoke<string>("app_ping")
  .then((v) => {
    statusEl.textContent = v === "pong" ? "Ready" : "Bridge answered unexpectedly";
  })
  .catch(() => {
    statusEl.textContent = "Bridge not available";
  });

address.focus();
