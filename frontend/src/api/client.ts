import type { ProblemDetail } from './types';

/** An API failure carrying the backend's ProblemDetail (Romanian, user-facing messages). */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Cererea a eșuat (${status}).`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }

  /** Field name -> message, ready to hand to a form. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries((this.problem.errors ?? []).map((error) => [error.field, error.message]));
  }
}

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export function toQueryString(params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request<T>(method: string, path: string, options: { query?: QueryParams; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(`/api${path}${toQueryString(options.query)}`, {
      method,
      headers: hasBody ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, { title: 'Fără conexiune', detail: 'Serverul nu poate fi contactat. Verificați conexiunea și încercați din nou.' });
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function readProblem(response: Response): Promise<ProblemDetail> {
  try {
    const body = (await response.json()) as ProblemDetail;
    if (body.detail || body.title) {
      return body;
    }
  } catch {
    // Not JSON, e.g. an nginx error page while the backend restarts.
  }
  return response.status >= 500
    ? { title: 'Eroare de server', detail: 'Serverul nu a putut procesa cererea. Încercați din nou.' }
    : { title: 'Eroare', detail: `Cererea a eșuat (${response.status}).` };
}

export const api = {
  get: <T>(path: string, query?: QueryParams) => request<T>('GET', path, { query }),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, { body }),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
  delete: (path: string) => request<void>('DELETE', path),
};
