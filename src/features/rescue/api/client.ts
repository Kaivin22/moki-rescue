import Constants from 'expo-constants';
import { supabase } from '@/src/services/supabase';
import { RescueTiming } from '@/src/features/rescue/config/operational';
import { useI18n } from '@/src/i18n';

// API paths below already include `/api`. Accept the old accidental `/api`
// suffix in local configuration without producing `/api/api/...` requests.
const baseUrl = String(Constants.expoConfig?.extra?.apiUrl ?? '')
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

interface ErrorPayload {
  code?: string;
  message?: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly outcomeUnknown = false,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const ENGLISH_API_ERRORS: Record<string, string> = {
  WORKING_HOURS_CLOSED:
    'The shop is closed, paused, has no schedule, or this invitation belongs to an ended readiness session. Accepted cases can continue.',
  WORKING_HOURS_CHANGED: 'The schedule was edited elsewhere. Reload it before saving.',
  INVALID_WORKING_HOURS: 'Use one valid, non-overlapping interval per start day. All day is 00:00–24:00.',
  COMMUNICATION_NOT_FOUND: 'This item was not found or you do not have access to it.',
  COMMUNICATION_CHANGED: 'This item changed. Refresh before trying again.',
  SUPPORT_CLOSED: 'This ticket is closed and no longer accepts replies.',
  SUPPORT_LIMIT: 'You already have 10 open tickets. Please continue an existing conversation.',
  INVALID_PROVIDER_DECISION: 'Choose approve or reject.',
  PROVIDER_REVIEW_CHANGED:
    'This application changed, the account is inactive or the shop is suspended. Refresh the list.',
  PROVIDER_REVIEW_REQUIRED: 'Use the provider approval list to approve or reject a pending application.',
  SHOP_OUTSIDE_SERVICE_AREA: 'Ask an administrator to save valid shop coordinates inside the service area.',
  INVALID_SHOP_ADDRESS: 'Enter a shop address of 5–300 characters, excluding leading/trailing spaces.',
  TEAM_LOCATION_IN_USE:
    'Turn off availability for all members and finish open cases/offers before moving the shop.',
  API_NOT_CONFIGURED: 'The API server is not configured.',
  AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
  AUTH_UNAVAILABLE:
    'The sign-in service is temporarily unreachable. Your session has not been cleared. Try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  NETWORK_ERROR: 'Cannot reach the server. Check your connection.',
  REQUEST_TIMEOUT: 'The server did not respond in time.',
  INVALID_SUBJECT: 'Your session identity is invalid. Please sign in again.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',
  ACCOUNT_INACTIVE: 'This account is inactive.',
  CONSENT_REQUIRED: 'Please accept the current terms before continuing.',
  ROLE_REQUIRED: 'This account does not have the required role.',
  ACTIVE_REQUEST_EXISTS: 'Finish or cancel your active request before creating another one.',
  EMERGENCY_HANDOFF_REQUIRED: 'Contact emergency services before requesting technical roadside assistance.',
  IDEMPOTENCY_KEY_REUSED: 'This submission identifier was already used with different information.',
  CREATE_FAILED: 'The rescue request could not be created.',
  OUTSIDE_SERVICE_AREA: 'This location is outside the current service area.',
  PROVIDER_OUTSIDE_SERVICE_AREA:
    'You are outside the Da Nang demo service area. Availability is now off. Return to the service area before enabling it again.',
  OFFER_OUTSIDE_SERVICE_AREA:
    'The provider or job location is outside the current service area. This offer cannot be accepted.',
  DESTINATION_INCOMPLETE: 'Provide the complete drop-off name and coordinates.',
  DESTINATION_OUTSIDE_SERVICE_AREA: 'The drop-off is outside the current service area.',
  DESTINATION_REQUIRED: 'Choose a motorcycle drop-off point before continuing.',
  DESTINATION_TOO_CLOSE: 'The drop-off must be at least 50 metres from the pickup.',
  REQUEST_RATE_LIMITED: 'You have created too many requests. Please wait and try again.',
  LATE_CANCELLATION_COOLDOWN:
    'Several recent requests were cancelled after a provider departed. Contact dispatch if you need urgent help.',
  SAFETY_NOT_ACKNOWLEDGED: 'Confirm that you and the motorcycle are in a safe position.',
  SERVICE_NOT_AVAILABLE: 'This rescue service is currently unavailable.',
  VEHICLE_OUTSIDE_SCOPE:
    'Only gasoline motorcycles are currently supported. Electric and unidentified vehicle types are outside the service scope.',
  SERVICE_NOT_FOUND: 'The rescue service was not found.',
  INVALID_SERVICE_CODE: 'The rescue service code is invalid.',
  INVALID_SERVICE_ICON: 'The rescue service icon is not supported by this app version.',
  REQUEST_NOT_FOUND: 'The rescue request was not found.',
  INVALID_CURSOR: 'The history cursor is incomplete. Refresh the list and try again.',
  INVALID_INBOX: 'This moderation inbox is not supported.',
  INVALID_STATUS: 'This status filter is not valid for the selected inbox.',
  MODERATION_NOT_FOUND: 'This review, report, or quality alert no longer exists.',
  REQUEST_ACCESS_DENIED: 'You do not have access to this rescue request.',
  REQUEST_VERSION_CONFLICT: 'The request changed on another device. Refresh and try again.',
  INVALID_REQUEST_ACTION: 'This action is not valid for the current request status.',
  CASE_RESOLUTION_INVALID: 'Choose a result and provide 10–500 characters of verification evidence.',
  CASE_RESOLUTION_REQUIRED:
    'Open the job to verify completion or cancel with a reason. Keep the alert open if unverified.',
  INVALID_CANCELLATION_REASON: 'Choose a cancellation reason that matches the current request status.',
  CANCELLATION_NOTE_REQUIRED: 'Enter a short explanation for the selected cancellation reason.',
  REQUEST_NOT_RETRYABLE: 'This request cannot be dispatched again in its current status.',
  REQUEST_NOT_REASSIGNABLE: 'This request cannot be reassigned in its current status.',
  REQUEST_NOT_WITHDRAWABLE: 'This request can no longer be returned to dispatch.',
  REQUEST_RETRY_LIMITED: 'Wait before trying to find another team again.',
  SUPPORT_REASON_REQUIRED: 'Describe what dispatch should help with.',
  INCIDENT_NOT_ALLOWED: 'An incident can only be reported after a rescue team accepts the request.',
  INCIDENT_ALREADY_REPORTED: 'You already reported this type of incident for the request.',
  INCIDENT_ALREADY_RESOLVED: 'This incident was already handled.',
  PROVIDER_NOT_ASSIGNED: 'No rescue provider has been assigned yet.',
  PROVIDER_LOCATION_PENDING: 'This case has no provider location recorded at assignment.',
  PROVIDER_LOCATION_REQUIRED: 'A current provider location is required.',
  PROVIDER_LOCATION_STALE: 'The provider location is too old to calculate a safe route.',
  PROVIDER_LOCATION_INACCURATE: 'The provider location is not accurate enough.',
  ROUTE_NOT_ACTIVE: 'This case is no longer active for viewing its route.',
  ROUTING_UNAVAILABLE: 'Motorcycle road routing is temporarily unavailable.',
  REVIEW_NOT_ALLOWED: 'Only a completed request can be reviewed.',
  REVIEW_WINDOW_CLOSED: 'The review editing period for this request has ended.',
  REVIEW_NOT_FOUND: 'Your review was not found.',
  PROVIDER_ROLE_REQUIRED: 'This function is only available to rescue providers.',
  PROVIDER_NOT_READY: 'The rescue provider account or team is not verified.',
  PROVIDER_NOT_FOUND: 'The rescue provider was not found in this team.',
  PROVIDER_NOT_AVAILABLE: 'Turn on availability before updating the offer location.',
  PROVIDER_HAS_ACTIVE_REQUEST: 'Availability cannot be enabled while handling an active request.',
  LOCATION_NOT_ALLOWED: 'Live case GPS updates are no longer accepted. Use Google Maps for navigation.',
  LOCATION_NOT_ACCURATE: 'The location is not accurate enough. Move to an open area and try again.',
  WITHDRAWAL_REASON_REQUIRED: 'Enter why the provider cannot continue.',
  OFFER_NOT_AVAILABLE: 'This offer expired or was accepted by someone else.',
  STAFF_ROLE_REQUIRED: 'This function is only available to operations staff.',
  ADMIN_ROLE_REQUIRED: 'This function is only available to operations administrators.',
  TEAM_NOT_FOUND: 'The rescue team was not found.',
  ACCOUNT_NOT_FOUND: 'No active account was found for that sign-in phone number.',
  USER_NOT_FOUND: 'The user was not found.',
  DUPLICATE_VERIFICATION_CHECK: 'The verification checklist contains duplicate items.',
  PARTNER_REFERENCE_EXISTS: 'That internal partner reference is already in use.',
  VERIFICATION_CHECKLIST_CHANGED: 'The verification checklist changed. Reload it and try again.',
  VERIFIED_TEAM_REQUIREMENTS_REQUIRED: 'A verified team must keep every activation requirement.',
  TEAM_VERIFICATION_INCOMPLETE: 'Complete the checklist, capabilities, and provider assignment first.',
  INVALID_CAPABILITIES: 'Select at least one valid rescue capability.',
  INVALID_TEAM_LOCATION: 'Provide both valid base coordinates or leave both empty.',
  CANNOT_DEMOTE_SELF: 'You cannot remove your own administrator role.',
  CANNOT_DEMOTE_LAST_ADMIN: 'Assign another administrator before demoting the last active admin.',
  ROLE_ASSIGNMENT_CONFLICT: 'This account role cannot be changed through this operation.',
  ACTIVE_REQUEST_EXISTS_DELETE: 'The account cannot be deleted while a rescue request is active.',
  ADMIN_DELETION_REQUIRES_HANDOVER: 'Assign another administrator before deleting this account.',
  QUALITY_ALERT_ALREADY_ACTIONED: 'This quality alert has already been handled.',
  QUALITY_ALERT_NOT_FOUND: 'The quality alert was not found.',
  ATTENTION_ALREADY_RESOLVED: 'This operational alert was already resolved.',
  FEEDBACK_REASON_REQUIRED: 'Choose a reason before requesting correction.',
  FEEDBACK_NOTE_REQUIRED: 'Add a short explanation for the selected reason.',
  ASSISTANT_MINUTE_LIMIT: 'Assistant rate limit reached. Please wait a minute.',
  ASSISTANT_DAILY_LIMIT: 'Daily assistant limit reached. Please try again tomorrow.',
  ASSISTANT_NOT_CONFIGURED: 'The assistant is not configured.',
  ASSISTANT_UNAVAILABLE: 'The assistant is temporarily unavailable.',
  API_RATE_LIMITED: 'Too many requests. Please wait and try again.',
  VALIDATION_ERROR: 'Check the information you entered and try again.',
  DATABASE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  DATABASE_CONFLICT: 'The data changed while processing your request. Refresh and try again.',
  INTERNAL_ERROR: 'The server could not process the request.',
};

function localizedMessage(code: string, serverMessage: string | undefined, fallback: string) {
  if (useI18n.getState().language === 'vi') return serverMessage ?? fallback;
  return ENGLISH_API_ERRORS[code] ?? 'The server could not process the request.';
}

const UNAVAILABLE_MESSAGES: Record<string, string> = {
  AUTH_UNAVAILABLE:
    'Tạm thời không kết nối được dịch vụ đăng nhập. Phiên của bạn chưa bị xóa. Vui lòng thử lại sau.',
  DATABASE_UNAVAILABLE: 'Máy chủ dữ liệu đang tạm thời không sẵn sàng.',
  SERVICE_UNAVAILABLE: 'Dịch vụ đang tạm thời gián đoạn. Vui lòng thử lại sau.',
  NETWORK_ERROR: 'Không thể kết nối máy chủ. Kiểm tra kết nối mạng.',
  REQUEST_TIMEOUT: 'Máy chủ chưa phản hồi trong thời gian chờ.',
  ROUTING_UNAVAILABLE: 'Tạm thời không tính được tuyến đường cứu hộ. Vui lòng thử lại sau.',
  ASSISTANT_UNAVAILABLE: 'Trợ lý đang tạm thời không sẵn sàng.',
  ASSISTANT_NOT_CONFIGURED: 'Trợ lý chưa được cấu hình.',
};

function unavailableError(code: string, status?: number, outcomeUnknown = false) {
  const warning =
    useI18n.getState().language === 'vi'
      ? ' Chưa xác nhận được kết quả thao tác. Kiểm tra ca hoặc dữ liệu hiện tại trước khi gửi lại.'
      : ' The operation outcome is unknown. Check the current case or data before submitting again.';
  return new ApiClientError(
    code,
    localizedMessage(code, undefined, UNAVAILABLE_MESSAGES[code]) + (outcomeUnknown ? warning : ''),
    status,
    outcomeUnknown,
  );
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!baseUrl) {
    throw new ApiClientError(
      'API_NOT_CONFIGURED',
      localizedMessage('API_NOT_CONFIGURED', undefined, 'Máy chủ API chưa được cấu hình.'),
    );
  }
  const controller = new AbortController();
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase());
  let requestSent = false;
  let sessionResolved = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  // Includes session refresh and response-body reading. Aborting fetch alone does
  // not bound getSession, and a late session must never dispatch a timed-out write.
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(
        unavailableError(
          sessionResolved ? 'REQUEST_TIMEOUT' : 'AUTH_UNAVAILABLE',
          undefined,
          mutation && requestSent,
        ),
      );
    }, RescueTiming.apiTimeoutMs);
  });
  const send = async (): Promise<T> => {
    let sessionResult;
    try {
      sessionResult = await supabase.auth.getSession();
    } catch {
      throw unavailableError('AUTH_UNAVAILABLE');
    }
    if (controller.signal.aborted) throw unavailableError('AUTH_UNAVAILABLE');
    const { data, error } = sessionResult;
    if (
      error &&
      (!error.status ||
        error.status >= 500 ||
        error.status === 429 ||
        error.name === 'AuthRetryableFetchError')
    ) {
      throw unavailableError('AUTH_UNAVAILABLE');
    }
    if (error || !data.session?.access_token) {
      throw new ApiClientError(
        'AUTH_REQUIRED',
        localizedMessage('AUTH_REQUIRED', undefined, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'),
      );
    }
    sessionResolved = true;
    requestSent = true;
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Language': useI18n.getState().language,
        Authorization: `Bearer ${data.session.access_token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      let payload: ErrorPayload = {};
      try {
        const body = (await response.json()) as ErrorPayload | null;
        payload = {
          code: typeof body?.code === 'string' ? body.code : undefined,
          message: typeof body?.message === 'string' ? body.message : undefined,
        };
      } catch {
        // Do not expose an HTML/proxy error body to the user.
      }
      if (response.status >= 500 || response.status === 408) {
        // Neither a gateway failure nor a server error proves a write was rolled back.
        // Do not expose database/proxy diagnostics supplied in a 5xx response.
        const code =
          response.status === 408
            ? 'REQUEST_TIMEOUT'
            : payload.code && Object.hasOwn(UNAVAILABLE_MESSAGES, payload.code)
              ? payload.code
              : 'SERVICE_UNAVAILABLE';
        throw unavailableError(code, response.status, mutation);
      }
      throw new ApiClientError(
        payload.code ?? `HTTP_${response.status}`,
        localizedMessage(
          payload.code ?? `HTTP_${response.status}`,
          payload.message,
          'Máy chủ không thể xử lý yêu cầu.',
        ),
        response.status,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  };
  try {
    return await Promise.race([send(), deadline]);
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw unavailableError('REQUEST_TIMEOUT', undefined, mutation && requestSent);
    }
    throw unavailableError('NETWORK_ERROR', undefined, mutation && requestSent);
  } finally {
    clearTimeout(timeout);
  }
}
