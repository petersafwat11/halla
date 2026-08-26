import { create } from "zustand";

/**
 * Coordinates dirty Create/Update Event forms with the authenticated tab bar.
 * The form owns cleanup; navigation only asks for it before changing stacks.
 */
export const useWizardNavigationGuardStore = create((set) => ({
  isDirty: false,
  discard: null,
  setGuard: ({ isDirty, discard }) => set({ isDirty: !!isDirty, discard }),
  clearGuard: () => set({ isDirty: false, discard: null }),
}));

