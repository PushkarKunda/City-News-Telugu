import { create } from 'zustand';

interface TabBarState {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  /** Measured height of the tab bar (icon strip + bottom inset). Updated by TabBar on mount. */
  height: number;
  setHeight: (height: number) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  visible: true,
  setVisible: (visible) => set((s) => (s.visible === visible ? s : { visible })),
  height: 0,
  setHeight: (height) => set((s) => (s.height === height ? s : { height })),
}));
