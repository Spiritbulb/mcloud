export const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

export const rand = (min: number, max: number) =>
  Math.round(min + Math.random() * (max - min));

export const id = () => Math.random().toString(36).slice(2, 10);

// Simulate an occasional failure so error states are reachable.
export const maybeError = (rate = 0.08) => {
  if (Math.random() < rate) throw new Error('Something went wrong. Please try again.');
};
