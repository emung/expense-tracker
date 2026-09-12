import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { currentMonth, isValidMonth } from '../lib/month';

/** The month shown on a page lives in `?luna=YYYY-MM`, so it survives reloads and the back button. */
export function useMonthParam(): [month: string, setMonth: (month: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('luna');
  const month = isValidMonth(raw) ? raw : currentMonth();

  const setMonth = useCallback(
    (next: string) =>
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous);
        params.set('luna', next);
        params.delete('pagina');
        return params;
      }),
    [setSearchParams],
  );

  return [month, setMonth];
}
