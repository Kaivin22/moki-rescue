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
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const ENGLISH_API_ERRORS: Record<string, string> = {
  API_NOT_CONFIGURED: 'The API server is not configured.',
  AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
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
  DESTINATION_INCOMPLETE: 'Provide the complete drop-off name and coordinates.',
  DESTINATION_OUTSIDE_SERVICE_AREA: 'The drop-off is outside the current service area.',
  DESTINATION_REQUIRED: 'Choose a motorcycle drop-off point before continuing.',
  DESTINATION_TOO_CLOSE: 'The drop-off must be at least 50 metres from the pickup.',
  REQUEST_RATE_LIMITED: 'You have created too many requests. Please wait and try again.',
  LATE_CANCELLATION_COOLDOWN:
    'Several recent requests were cancelled after a provider departed. Contact dispatch if you need urgent help.',
  SAFETY_NOT_ACKNOWLEDGED: 'Confirm that you and the motorcycle are in a safe position.',
  SERVICE_NOT_AVAILABLE: 'This rescue service is currently unavailable.',
  SERVICE_NOT_FOUND: 'The rescue service was not found.',
  INVALID_SERVICE_CODE: 'The rescue service code is invalid.',
  INVALID_SERVICE_ICON: 'The rescue service icon is not supported by this app version.',
  REQUEST_NOT_FOUND: 'The rescue request was not found.',
  INVALID_CURSOR: 'The history cursor is incomplete. Refresh the list and try again.',
  REQUEST_ACCESS_DENIED: 'You do not have access to this rescue request.',
  REQUEST_VERSION_CONFLICT: 'The request changed on another device. Refresh and try again.',
  INVALID_REQUEST_ACTION: 'This action is not valid for the current request status.',
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
  PROVIDER_LOCATION_PENDING: 'The rescue provider has not shared a current location yet.',
  PROVIDER_LOCATION_REQUIRED: 'A current provider location is required.',
  PROVIDER_LOCATION_STALE: 'The provider location is too old to calculate a safe route.',
  PROVIDER_LOCATION_INACCURATE: 'The provider location is not accurate enough.',
  ROUTE_NOT_ACTIVE: 'Live route tracking has ended for this request.',
  ROUTING_UNAVAILABLE: 'Motorcycle road routing is temporarily unavailable.',
  REVIEW_NOT_ALLOWED: 'Only a completed request can be reviewed.',
  REVIEW_WINDOW_CLOSED: 'The review editing period for this request has ended.',
  REVIEW_NOT_FOUND: 'Your review was not found.',
  PROVIDER_ROLE_REQUIRED: 'This function is only available to rescue providers.',
  PROVIDER_NOT_READY: 'The rescue provider account or team is not verified.',
  PROVIDER_NOT_FOUND: 'The rescue provider was not found in this team.',
  PROVIDER_NOT_AVAILABLE: 'Turn on availability before updating the offer location.',
  PROVIDER_HAS_ACTIVE_REQUEST: 'Availability cannot be enabled while handling an active request.',
  LOCATION_NOT_ALLOWED: 'This request is not assigned to you.',
  LOCATION_NOT_ACCURATE: 'The location is not accurate enough. Move to an open area and try again.',
  WITHDRAWAL_REASON_REQUIRED: 'Enter why the provider cannot continue.',
  OFFER_NOT_AVAILABLE: 'This offer expired or was accepted by someone else.',
  STAFF_ROLE_REQUIRED: 'This function is only available to operations staff.',
  ADMIN_ROLE_REQUIRED: 'This function is only available to operations administrators.',
  TEAM_NOT_FOUND: 'The rescue team was not found.',
  ACCOUNT_NOT_FOUND: 'No active account was found for that sign-in phone number.',
  USER_NOT_FOUND: 'The user was not found.',
  DUPLICATE_VERIFICATION_CHECK: 'The verification checklist contains duplicate items.',
  CONTRACT_REFERENCE_EXISTS: 'That internal partner reference is already in use.',
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

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!baseUrl) {
    throw new ApiClientError(
      'API_NOT_CONFIGURED',
      localizedMessage('API_NOT_CONFIGURED', undefined, 'Máy chủ API chưa được cấu hình.'),
    );
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new ApiClientError(
      'AUTH_REQUIRED',
      localizedMessage('AUTH_REQUIRED', undefined, 'Phiên đăng nhập đã hết hạn.'),
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RescueTiming.apiTimeoutMs);
  try {
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
        payload = (await response.json()) as ErrorPayload;
      } catch {
        // Do not expose an HTML/proxy error body to the user.
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
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        'REQUEST_TIMEOUT',
        localizedMessage('REQUEST_TIMEOUT', undefined, 'Kết nối quá chậm. Vui lòng thử lại.'),
      );
    }
    throw new ApiClientError(
      'NETWORK_ERROR',
      localizedMessage('NETWORK_ERROR', undefined, 'Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.'),
    );
  } finally {
    clearTimeout(timeout);
  }
}
