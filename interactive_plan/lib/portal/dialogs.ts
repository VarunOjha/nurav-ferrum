/**
 * Element ids of the server-rendered popups, shared by the server components that render them and the
 * client buttons that open them (no file access; safe to import from client code).
 */

/** The phase popup of one phase (rendered once, in the layout, so every tab can open it). */
export const phaseDialogId = (id: string): string => `phase-dialog-${id}`;

/** A detail popup (decision, risk, research item) on its own tab. */
export const detailDialogId = (id: string): string => `detail-dialog-${id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
