/**
 * Several integrations fall back to synthesised data when their credentials are
 * missing, so that the UI still renders during development. That fallback is
 * only safe if the caller can tell the difference - an unlabelled synthetic
 * number is indistinguishable from a real one, and someone could set a budget
 * against it.
 *
 * Every such record carries `isMockData`. These helpers turn that into an
 * explicit, response-level marker.
 */

export type DataSource = 'live' | 'mock' | 'partial';

interface Maybe {
  isMockData?: boolean;
}

export function detectDataSource(
  payload: Maybe | Maybe[] | null | undefined,
): DataSource {
  if (!payload) return 'live';

  if (Array.isArray(payload)) {
    if (payload.length === 0) return 'live';
    const mocked = payload.filter((row) => row?.isMockData).length;
    if (mocked === 0) return 'live';
    return mocked === payload.length ? 'mock' : 'partial';
  }

  return payload.isMockData ? 'mock' : 'live';
}

const MOCK_WARNING =
  'This response contains placeholder data because the upstream integration is not configured. Do not use it for reporting or budget decisions.';

/** Wraps a payload with an explicit data-source marker. */
export function withDataSource<T extends Maybe | Maybe[]>(
  data: T,
  options: { key?: string } = {},
) {
  const dataSource = detectDataSource(data);
  return {
    [options.key ?? 'data']: data,
    dataSource,
    ...(dataSource === 'live' ? {} : { warning: MOCK_WARNING }),
  };
}
