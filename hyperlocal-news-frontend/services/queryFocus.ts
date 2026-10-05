import type { AppStateStatus } from 'react-native';

export function bindQueryFocus(
  appState: {
    currentState: AppStateStatus;
    addEventListener: (event: 'change', listener: (state: AppStateStatus) => void) => { remove: () => void };
  },
  focus: { setFocused: (focused: boolean | undefined) => void },
) {
  focus.setFocused(appState.currentState === 'active');
  const subscription = appState.addEventListener('change', (state) => {
    focus.setFocused(state === 'active');
  });
  return () => {
    subscription.remove();
    focus.setFocused(undefined);
  };
}
