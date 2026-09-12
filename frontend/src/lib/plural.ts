/**
 * Romanian count phrase: 1 cheltuială, 2 cheltuieli, 20 de cheltuieli.
 * Romanian inserts "de" when the number's last two digits are 00 or 20-99 (mirrors the backend's Text.countLabel).
 */
export function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`;
  }
  const lastTwo = Math.abs(count) % 100;
  const needsDe = count !== 0 && (lastTwo === 0 || lastTwo >= 20);
  return `${count}${needsDe ? ' de ' : ' '}${plural}`;
}
