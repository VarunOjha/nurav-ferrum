// Ferrum shell (trusted web view, label "shell"). P2 task p2.2: the toolbar only; navigation is wired in p2.6-p2.8.
export {};
const statusEl = document.getElementById("status") as HTMLSpanElement;
const address = document.getElementById("address") as HTMLInputElement;
const form = document.getElementById("address-form") as HTMLFormElement;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  statusEl.textContent = "Navigation arrives in a later step of phase 2.";
});

address.focus();
statusEl.textContent = "Ferrum (phase 2 skeleton)";
