import '@testing-library/jest-dom/vitest';

// Deterministic "now" so relative-time assertions don't depend on the clock.
process.env.TZ = 'UTC';
