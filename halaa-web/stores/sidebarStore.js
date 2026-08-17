import { create } from 'zustand';

const useSidebarStore = create((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export default useSidebarStore;
