import { useHotkeys } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { focusHotkeyTarget, type HotkeyTargetName } from '../lib/hotkeys';
import { paths } from '../lib/paths';

/** `g` starts a "go to" sequence; the destination key has to follow within this window. */
const SEQUENCE_WINDOW_MS = 1200;

interface AppHotkeysOptions {
  /** Turns a nav path into the href to navigate to - the layout's month-preserving one. */
  resolveHref: (path: string) => string;
  onShowShortcuts: () => void;
}

/**
 * The app-wide shortcuts, bound once in the layout. Mantine's `useHotkeys` already ignores
 * keystrokes typed into a field; on top of that we ignore everything while a modal is open, so a
 * shortcut never acts on the page hidden behind it.
 */
export function useAppHotkeys({ resolveHref, onShowShortcuts }: AppHotkeysOptions) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pendingFocus, setPendingFocus] = useState<{ target: HotkeyTargetName; path: string } | null>(null);
  const sequenceStartedAt = useRef(0);

  const go = (path: string) => {
    void navigate(resolveHref(path));
  };

  /** Focuses the field, or goes to the page that has it and focuses it once that page is up. */
  const focusOn = (target: HotkeyTargetName, path: string) => {
    if (focusHotkeyTarget(target)) return;
    setPendingFocus({ target, path });
    go(path);
  };

  // Navigation is a transition, so the destination renders a commit or two after the request.
  useEffect(() => {
    if (!pendingFocus || !pathname.startsWith(pendingFocus.path)) return;
    focusHotkeyTarget(pendingFocus.target);
    setPendingFocus(null);
  }, [pendingFocus, pathname]);

  /** Second key of a `g …` sequence: only navigates if `g` was the key just before it. */
  const afterG = (path: string) => () => {
    const started = sequenceStartedAt.current;
    sequenceStartedAt.current = 0;
    if (Date.now() - started < SEQUENCE_WINDOW_MS) go(path);
  };

  const unlessModalOpen = (action: () => void) => () => {
    if (document.querySelector('[aria-modal="true"]') === null) action();
  };

  useHotkeys([
    ['n', unlessModalOpen(() => focusOn('merchant', paths.expenses))],
    ['/', unlessModalOpen(() => focusOn('search', paths.expenses))],
    ['g', unlessModalOpen(() => {
      sequenceStartedAt.current = Date.now();
    })],
    ['c', unlessModalOpen(afterG(paths.expenses))],
    ['r', unlessModalOpen(afterG(paths.report))],
    ['s', unlessModalOpen(afterG(paths.settings))],
    // `?` needs Shift on most layouts and none on some, so both spellings are bound.
    ['shift+?', unlessModalOpen(onShowShortcuts)],
    ['?', unlessModalOpen(onShowShortcuts)],
  ]);
}
