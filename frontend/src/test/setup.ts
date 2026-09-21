import '@testing-library/jest-dom/vitest';
import { notifications } from '@mantine/notifications';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// `globals` is off, so React Testing Library's automatic cleanup has to be wired up by hand.
afterEach(cleanup);

// The notifications store is a module-level singleton: it survives `cleanup` and would reappear in
// the next test that mounts a container.
afterEach(() => {
  notifications.clean();
  notifications.cleanQueue();
});

// Mantine measures, observes and scrolls; jsdom implements none of that.
const { getComputedStyle } = window;
window.getComputedStyle = (element) => getComputedStyle(element);
window.HTMLElement.prototype.scrollIntoView = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
