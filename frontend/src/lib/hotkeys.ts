/**
 * Keyboard shortcuts in one place: the hook that binds them and the cheat sheet that documents them
 * read the same list, so a shortcut cannot exist without being discoverable.
 */

/** A field a shortcut can jump to. The page that owns it marks it with {@link hotkeyTarget}. */
export type HotkeyTargetName = 'merchant' | 'search';

/** Spread onto the input the shortcut should focus: `<TextInput {...hotkeyTarget('search')} />`. */
export function hotkeyTarget(name: HotkeyTargetName): { 'data-hotkey-target': HotkeyTargetName } {
  return { 'data-hotkey-target': name };
}

/** Focuses that field if the current page has it; false means the caller has to navigate first. */
export function focusHotkeyTarget(name: HotkeyTargetName): boolean {
  const element = document.querySelector<HTMLElement>(`[data-hotkey-target="${name}"]`);
  if (!element) return false;
  element.focus();
  // Selecting what is already there means the next keystroke replaces it instead of appending.
  if (element instanceof HTMLInputElement) element.select();
  return true;
}

export interface ShortcutHelp {
  /** Keys in the order they are pressed. `mod` renders as ⌘ or Ctrl, depending on the OS. */
  keys: string[];
  /** Held together (`Ctrl+Enter`) instead of pressed one after the other (`g` then `c`). */
  together?: boolean;
  description: string;
}

export const SHORTCUTS: ShortcutHelp[] = [
  { keys: ['n'], description: 'Înregistrare nouă' },
  { keys: ['Enter'], description: 'Salvează, dintr-un câmp de text' },
  { keys: ['mod', 'Enter'], together: true, description: 'Salvează, chiar și dintr-o listă deschisă' },
  { keys: ['/'], description: 'Caută în lista lunii' },
  { keys: ['g', 'c'], description: 'Mergi la cheltuieli' },
  { keys: ['g', 'r'], description: 'Mergi la raport' },
  { keys: ['g', 's'], description: 'Mergi la setări' },
  { keys: ['Esc'], description: 'Închide fereastra deschisă' },
  { keys: ['?'], description: 'Arată scurtăturile' },
];
