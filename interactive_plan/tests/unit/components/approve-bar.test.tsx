// @vitest-environment jsdom
// ApproveBar (ip-testing §1.7): the comment is required for request-changes and reject; disabled when
// the state is INVALID or in read-only mode; shows the 409 PAGE_CHANGED message; announces the new
// state through aria-live. Plus: the request body (seen_content_hash, seen_bootstrap_hash for schema
// only), other API errors, the diff toggle and history. fetch and the router are mocked; no server.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

import ApproveBar, { COMMENT_REQUIRED_MESSAGE, disabledReason, PAGE_CHANGED_MESSAGE, type ApproveBarProps } from "@/components/ApproveBar";

const H = "sha256:" + "ab".repeat(32);
const S = "sha256:" + "cd".repeat(32);
const B = "sha256:" + "ef".repeat(32);

const base: ApproveBarProps = {
  itemKey: "adr-0901",
  label: "Page approval",
  state: "PENDING",
  record: null,
  contentHash: H,
  scopeHash: S,
  readonly: false,
};

const fetchMock = vi.fn();
const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });

beforeEach(() => {
  fetchMock.mockReset();
  refresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
const textarea = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const sentBody = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body as string);

describe("ApproveBar", () => {
  it("shows the effective state, the short hashes and 'none yet' without a record", () => {
    const { container } = render(<ApproveBar {...base} />);
    expect(screen.getByTestId("approve-state").textContent).toBe("pending");
    expect(screen.getByTestId("hash-content").textContent).toBe("ab".repeat(6));
    expect(container.textContent).toContain("cd".repeat(6));
    expect(container.textContent).toContain("none yet");
    expect(container.querySelector("[data-testid='approve-bar']")!.getAttribute("data-key")).toBe("adr-0901");
  });

  it.each(["Request changes", "Reject"])("requires a comment for %s: nothing is sent while it is empty or blank", async (name) => {
    render(<ApproveBar {...base} />);
    fireEvent.click(button(name));
    expect(screen.getByRole("alert").textContent).toBe(COMMENT_REQUIRED_MESSAGE);
    expect(textarea().getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(textarea(), { target: { value: "   \n " } });
    fireEvent.click(button(name));
    expect(fetchMock).not.toHaveBeenCalled();

    respond(200, { item: { state: name === "Reject" ? "REJECTED" : "CHANGES_REQUESTED" } });
    fireEvent.change(textarea(), { target: { value: "Please split the section" } });
    expect(textarea().getAttribute("aria-invalid")).toBeNull();
    fireEvent.click(button(name));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody()).toEqual({
      key: "adr-0901",
      status: name === "Reject" ? "rejected" : "changes-requested",
      comment: "Please split the section",
      seen_content_hash: H,
    });
  });

  it("does not require a comment for Approve and posts JSON with the rendered content hash", async () => {
    respond(200, { item: { state: "APPROVED" } });
    render(<ApproveBar {...base} />);
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/approvals");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(sentBody()).toEqual({ key: "adr-0901", status: "approved", comment: "", seen_content_hash: H });
    expect(sentBody()).not.toHaveProperty("seen_bootstrap_hash");
  });

  it("sends seen_bootstrap_hash for key schema only", async () => {
    respond(200, { item: { state: "APPROVED" } });
    render(<ApproveBar {...base} itemKey="schema" bootstrapHash={B} />);
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sentBody().seen_bootstrap_hash).toBe(B);
  });

  it("announces the new state through aria-live, shows it and refreshes the route", async () => {
    respond(200, { item: { state: "APPROVED" }, log_appended: true });
    const { container } = render(<ApproveBar {...base} />);
    const live = container.querySelector("[aria-live='polite']")!;
    expect(live.textContent).toBe("");
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(live.textContent).toBe("Page approval for adr-0901 recorded: approved"));
    expect(screen.getByTestId("approve-state").textContent).toBe("approved");
    expect(container.querySelector("[data-testid='approve-bar']")!.getAttribute("data-state")).toBe("APPROVED");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mentions log-append warnings in the announcement", async () => {
    respond(200, { item: { state: "APPROVED" }, log_appended: false, warnings: [{ code: "LOG_MISSING", message: "x" }] });
    const { container } = render(<ApproveBar {...base} />);
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(container.querySelector("[aria-live='polite']")!.textContent).toContain("warning: LOG_MISSING"));
  });

  it("shows the 409 PAGE_CHANGED message and keeps the old state", async () => {
    respond(409, { error: { code: "PAGE_CHANGED", message: "wiki/decisions/x.md changed since it was rendered" } });
    render(<ApproveBar {...base} />);
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(PAGE_CHANGED_MESSAGE));
    expect(PAGE_CHANGED_MESSAGE).toBe("This page changed since you loaded it – reload to review the new version");
    expect(screen.getByTestId("approve-state").textContent).toBe("pending");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows other API errors with their code, and network failures", async () => {
    respond(500, { error: { code: "APPROVALS_FILE_INVALID", message: "plan/approvals.json is invalid" } });
    render(<ApproveBar {...base} />);
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("APPROVALS_FILE_INVALID: plan/approvals.json is invalid"));
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: async () => Promise.reject(new Error("not json")) });
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("HTTP 502: the decision was not recorded"));
    fetchMock.mockRejectedValueOnce(new Error("connection refused"));
    fireEvent.click(button("Approve"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("The decision was not recorded: connection refused"));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("is disabled, with an explanation, when the state is INVALID", () => {
    render(<ApproveBar {...base} state="INVALID" />);
    for (const n of ["Approve", "Request changes", "Reject"]) expect(button(n).disabled).toBe(true);
    expect(textarea().disabled).toBe(true);
    expect(screen.getByTestId("approve-disabled").textContent).toMatch(/INVALID/);
    fireEvent.click(button("Approve"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is disabled, with an explanation, in read-only mode", () => {
    render(<ApproveBar {...base} readonly />);
    for (const n of ["Approve", "Request changes", "Reject"]) expect(button(n).disabled).toBe(true);
    expect(screen.getByTestId("approve-disabled").textContent).toMatch(/Read-only mode/);
  });

  it("disabledReason covers unhashable pages and schema without CLAUDE.md", () => {
    expect(disabledReason(base)).toBeNull();
    expect(disabledReason({ ...base, contentHash: null })).toMatch(/cannot be hashed/);
    expect(disabledReason({ ...base, itemKey: "schema", bootstrapHash: null })).toMatch(/CLAUDE\.md is missing/);
    expect(disabledReason({ ...base, itemKey: "schema", bootstrapHash: B })).toBeNull();
    expect(disabledReason({ ...base, readonly: true, state: "INVALID" })).toMatch(/Read-only/);
  });

  it("shows the stored decision, the expandable history and the diff since approval for STALE", () => {
    const { container } = render(
      <ApproveBar
        {...base}
        state="STALE"
        record={{
          status: "approved",
          comment: "ok",
          timestamp: "2026-10-09T10:00:00+05:30",
          history: [{ status: "changes-requested", comment: "fix it", timestamp: "2026-10-08T09:00:00+05:30" }],
        }}
        diff={{
          lines: [
            { op: "del", text: "old line", oldLine: 12 },
            { op: "add", text: "new line", newLine: 12 },
          ],
          note: null,
        }}
      />,
    );
    expect(container.textContent).toContain("Approved 2026-10-09T10:00:00+05:30, content changed since");
    expect(screen.getByText("History (1)")).toBeTruthy();
    expect(container.textContent).toContain("fix it");
    const toggle = button("Diff since approval");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("approve-diff")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const diff = screen.getByTestId("approve-diff");
    expect(diff.querySelector(".diff-del")!.textContent).toContain("old line");
    expect(diff.querySelector(".diff-add")!.textContent).toContain("new line");
  });

  it("shows the no-snapshot note instead of a diff, and no diff control for other states", () => {
    const note = "No snapshot was recorded with this approval. If git history exists: git log -p --follow -- wiki/x.md";
    const { rerender } = render(<ApproveBar {...base} state="APPROVED_VOLATILE_DRIFT" diff={{ lines: null, note }} />);
    expect(screen.getByTestId("approve-state").textContent).toBe("approved – bookkeeping changed");
    fireEvent.click(button("Diff since approval"));
    expect(screen.getByText(note)).toBeTruthy();
    rerender(<ApproveBar {...base} state="APPROVED" diff={{ lines: [], note: null }} />);
    expect(screen.queryByRole("button", { name: "Diff since approval" })).toBeNull();
  });
});
