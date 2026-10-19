// An async operation belongs to the session in which it started.
let version = 0;

export const getSessionVersion = () => version;
export const invalidateSession = () => ++version;
export const isCurrentSession = (expected: number) => expected === version;

export function assertCurrentSession(expected: number) {
  if (!isCurrentSession(expected)) {
    throw new Error('Session changed. Please try again.');
  }
}
