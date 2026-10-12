import { apiRequest, ApiClientError } from '@/src/features/rescue/api/client';
import { supabase } from '@/src/services/supabase';
import { useI18n } from '@/src/i18n';
import { RescueTiming } from '@/src/features/rescue/config/operational';

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { apiUrl: 'https://api.example.invalid/api/' } },
}));
jest.mock('@/src/services/supabase', () => ({
  auth: undefined,
  supabase: { auth: { getSession: jest.fn() } },
}));
jest.mock('@/src/i18n', () => ({ useI18n: { getState: jest.fn(() => ({ language: 'vi' })) } }));

const session = jest.mocked(supabase.auth.getSession);
const language = jest.mocked(useI18n.getState);
const originalFetch = global.fetch;
const fetchMock = jest.fn();
const validSession = { data: { session: { access_token: 'fixture-only' } }, error: null };
const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body),
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  global.fetch = fetchMock;
  fetchMock.mockReset();
  session.mockReset().mockResolvedValue(validSession as Awaited<ReturnType<typeof session>>);
  language.mockReturnValue({ language: 'vi' } as ReturnType<typeof useI18n.getState>);
});
afterEach(() => {
  expect(jest.getTimerCount()).toBe(0);
  global.fetch = originalFetch;
  jest.useRealTimers();
});

describe('API service-outage handling (mock network, no Supabase mutation)', () => {
  it('passes successful JSON and the token without duplicating /api', async () => {
    fetchMock.mockResolvedValue(response(200, { id: 'case-1' }));
    await expect(apiRequest('/api/rescue')).resolves.toEqual({ id: 'case-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.invalid/api/rescue',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer fixture-only' }),
      }),
    );
  });

  it('accepts a successful empty response without parsing a body', async () => {
    const empty = response(204, undefined);
    fetchMock.mockResolvedValue(empty);
    await expect(apiRequest('/api/read', { method: 'POST' })).resolves.toBeUndefined();
    expect(empty.json).not.toHaveBeenCalled();
  });

  it.each([502, 503, 504])('replaces HTTP %s proxy HTML with a service error', async (status) => {
    fetchMock.mockResolvedValue({
      ...response(status, null),
      json: jest.fn().mockRejectedValue(new SyntaxError('private HTML')),
    });
    await expect(apiRequest('/api/requests')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status,
      outcomeUnknown: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps database-unavailable classification but never exposes private server details', async () => {
    fetchMock.mockResolvedValue(
      response(503, { code: 'DATABASE_UNAVAILABLE', message: 'postgres password=PRIVATE' }),
    );
    const failure = await apiRequest('/api/requests', { method: 'POST', body: '{}' }).catch((error) => error);
    expect(failure).toBeInstanceOf(ApiClientError);
    if (!(failure instanceof ApiClientError)) throw new Error('Expected API failure');
    expect(failure).toMatchObject({ code: 'DATABASE_UNAVAILABLE', outcomeUnknown: true });
    expect(failure.message).toContain('Chưa xác nhận được');
    expect(failure.message).not.toContain('PRIVATE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not treat a real validation rejection as an uncertain operation', async () => {
    fetchMock.mockResolvedValue(
      response(409, { code: 'ACTIVE_REQUEST_EXISTS', message: 'Đã có ca đang hoạt động.' }),
    );
    await expect(apiRequest('/api/requests', { method: 'POST' })).rejects.toMatchObject({
      code: 'ACTIVE_REQUEST_EXISTS',
      outcomeUnknown: false,
    });
  });

  it('does not dereference a null proxy error body', async () => {
    fetchMock.mockResolvedValue(response(503, null));
    await expect(apiRequest('/api/requests')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it.each(['ROUTING_UNAVAILABLE', 'ASSISTANT_UNAVAILABLE', 'ASSISTANT_NOT_CONFIGURED'])(
    'preserves useful service-specific classification %s without raw server details',
    async (code) => {
      fetchMock.mockResolvedValue(response(503, { code, message: 'PRIVATE service diagnostics' }));
      await expect(apiRequest('/api/service')).rejects.toMatchObject({
        code,
        message: expect.not.stringContaining('PRIVATE'),
      });
    },
  );

  it.each([
    { status: 503, name: 'AuthApiError' },
    { status: 429, name: 'AuthApiError' },
    { status: 0, name: 'AuthRetryableFetchError' },
  ])('does not call an Auth outage an expired session: %j', async (error) => {
    session.mockResolvedValue({ data: { session: null }, error } as Awaited<ReturnType<typeof session>>);
    await expect(apiRequest('/api/requests', { method: 'POST' })).rejects.toMatchObject({
      code: 'AUTH_UNAVAILABLE',
      outcomeUnknown: false,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles a thrown session network failure without forwarding private diagnostics', async () => {
    session.mockRejectedValue(new Error('private Auth connection string'));
    const failure = await apiRequest('/api/requests').catch((error) => error);
    if (!(failure instanceof ApiClientError)) throw new Error('Expected API failure');
    expect(failure.code).toBe('AUTH_UNAVAILABLE');
    expect(failure.message).not.toContain('private');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires sign-in for a truly missing session', async () => {
    session.mockResolvedValue({ data: { session: null }, error: null });
    await expect(apiRequest('/api/requests')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires sign-in for an invalid refresh token', async () => {
    session.mockResolvedValue({
      data: { session: null },
      error: { status: 400, name: 'AuthApiError' },
    } as Awaited<ReturnType<typeof session>>);
    await expect(apiRequest('/api/requests')).rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('bounds session lookup and never sends a delayed write after the deadline', async () => {
    let resolveSession!: (value: Awaited<ReturnType<typeof session>>) => void;
    session.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        }),
    );
    const checked = expect(apiRequest('/api/requests', { method: 'POST' })).rejects.toMatchObject({
      code: 'AUTH_UNAVAILABLE',
      outcomeUnknown: false,
    });
    await jest.advanceTimersByTimeAsync(RescueTiming.apiTimeoutMs);
    await checked;
    resolveSession(validSession as Awaited<ReturnType<typeof session>>);
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounds even a fetch implementation that ignores abort, without retrying the write', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const checked = expect(apiRequest('/api/requests', { method: 'POST' })).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      outcomeUnknown: true,
    });
    await jest.advanceTimersByTimeAsync(RescueTiming.apiTimeoutMs);
    await checked;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('includes response-body reading in the same deadline', async () => {
    fetchMock.mockResolvedValue({ ...response(200, null), json: () => new Promise(() => {}) });
    const checked = expect(apiRequest('/api/requests')).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      outcomeUnknown: false,
    });
    await jest.advanceTimersByTimeAsync(RescueTiming.apiTimeoutMs);
    await checked;
  });

  it.each(['POST', 'PATCH', 'DELETE'])('flags an uncertain %s after connection loss', async (method) => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(apiRequest('/api/requests', { method })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      outcomeUnknown: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('localizes uncertainty and network failures in English', async () => {
    language.mockReturnValue({ language: 'en' } as ReturnType<typeof useI18n.getState>);
    fetchMock.mockRejectedValue(new TypeError('network'));
    await expect(apiRequest('/api/requests', { method: 'POST' })).rejects.toMatchObject({
      message: expect.stringContaining('outcome is unknown'),
    });
  });
});
