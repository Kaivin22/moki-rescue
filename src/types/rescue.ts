export type RescueStatus =
  | 'searching'
  | 'offered'
  | 'assigned'
  | 'en_route'
  | 'awaiting_arrival_confirmation'
  | 'arrived'
  | 'diagnosing'
  | 'awaiting_quote'
  | 'quote_approved'
  | 'repairing'
  | 'transporting'
  | 'awaiting_completion'
  | 'needs_dispatch'
  | 'completed'
  | 'cancelled'
  | 'no_provider';

export interface OperatorStatistics {
  timezone: string;
  fromDate: string;
  toDate: string;
  summary: { openCases: number; waitingCases: number; verifiedTeams: number; openAlerts: number };
  daily: { date: string; count: number }[];
  statuses: { status: RescueStatus; count: number }[];
}

export type CancellationReasonCode =
  | 'issue_resolved'
  | 'changed_mind'
  | 'wrong_location'
  | 'duplicate_request'
  | 'provider_not_present'
  | 'provider_unavailable'
  | 'safety_issue'
  | 'customer_unreachable'
  | 'duplicate_or_fraud'
  | 'other';

export interface CancelRescueInput {
  reasonCode: CancellationReasonCode;
  note?: string;
  expectedVersion: number;
}

export interface ServiceType {
  code: string;
  label: string;
  description: string;
  iconName: string;
  requiresQuote: boolean;
  requiresDestination: boolean;
}

export interface AdminServiceType {
  code: string;
  labelVi: string;
  descriptionVi: string;
  labelEn: string;
  descriptionEn: string;
  iconName: string;
  requiresQuote: boolean;
  requiresDestination: boolean;
  sortOrder: number;
  active: boolean;
}

export interface RequestCardData {
  id: string;
  status: RescueStatus;
  serviceCode: string;
  serviceLabel: string;
  serviceIcon: string;
  pickupAreaLabel: string;
  etaMinutes: number | null;
  attentionRequired: boolean;
  version: number;
  requestedAt: string;
  updatedAt: string;
}

export interface QuoteSummary {
  id: string;
  version: number;
  description: string;
  amountVnd: number;
  workType: 'repair' | 'transport';
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  createdAt: string;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracyM: number;
  recordedAt: string;
}

export interface ReviewSummary {
  rating: number;
  comment: string | null;
  updatedAt: string;
}

export interface RatingSummary {
  average: number | null;
  count: number;
}

export interface QualityAlertSummary {
  id: string;
  severity: 'warning' | 'critical';
  status: 'open' | 'warned' | 'resolved';
  averageRating: number;
  ratingCount: number;
  warningNumber: number | null;
  createdAt: string;
}

export interface QualityReview {
  id: string;
  requestId: string;
  providerName: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AttentionFlag {
  id: string;
  requestId: string;
  serviceLabel: string;
  requestStatus: RescueStatus;
  code: string;
  contextNote: string | null;
  status: 'open' | 'resolved';
  detectedAt: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

export interface StatusEvent {
  fromStatus: RescueStatus | null;
  toStatus: RescueStatus;
  createdAt: string;
}

export interface FeedbackSummary {
  action: 'reject_arrival' | 'reject_repair' | 'reject_transport';
  reasonCode: string;
  note: string | null;
  createdAt: string;
}

export interface IncidentReport {
  id: string;
  category: 'provider_conduct' | 'service_quality' | 'safety' | 'property_damage' | 'other';
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

export interface RequestDetails {
  id: string;
  status: RescueStatus;
  serviceCode: string;
  serviceLabel: string;
  serviceIcon: string;
  serviceRequiresQuote: boolean;
  serviceRequiresDestination: boolean;
  vehiclePowerType: 'gasoline' | 'electric' | 'unknown';
  vehicleDescription: string | null;
  activeWorkType: 'repair' | 'transport' | null;
  pickupAreaLabel: string;
  pickupNote: string | null;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationAreaLabel: string | null;
  destinationNote: string | null;
  destinationLatitude: number | null;
  destinationLongitude: number | null;
  assignedProviderId: string | null;
  providerName: string | null;
  providerContactPhone: string | null;
  providerTeamName: string | null;
  rescueVehicleLabel: string | null;
  roadDistanceM: number | null;
  etaMinutes: number | null;
  routingStatus: 'pending' | 'road' | 'unavailable';
  locationPrecision: 'exact' | 'approximate';
  cancellationCode: CancellationReasonCode | null;
  cancellationStage:
    'pre_dispatch' | 'assigned' | 'en_route' | 'arrival_disputed' | 'reassignment' | 'operational' | null;
  cancellationReason: string | null;
  lateCancellation: boolean;
  providerNearPickupOnCancel: boolean | null;
  version: number;
  requestedAt: string;
  updatedAt: string;
  providerRating: RatingSummary;
  teamRating: RatingSummary;
  currentQuote: QuoteSummary | null;
  review: ReviewSummary | null;
  providerLocation: LocationPoint | null;
  providerLocationStatus: 'pending' | 'snapshot' | 'not_applicable';
  attentionCodes: string[];
  feedback: FeedbackSummary[];
  incidentReports: IncidentReport[];
  events: StatusEvent[];
  operatorResolution?: {
    decision: 'verified_completed' | 'unverified';
    note: string | null;
    requestVersion: number;
    createdAt: string;
  } | null;
}

export interface CaseResolutionInput {
  decision: 'verified_completed' | 'unverified';
  note: string;
  expectedVersion: number;
}

export interface RoadRoute {
  phase: 'to_pickup' | 'to_destination';
  distanceMeters: number;
  durationSeconds: number;
  coordinates: { latitude: number; longitude: number }[];
}

export interface Offer {
  id: string;
  requestId: string;
  serviceCode: string;
  serviceLabel: string;
  pickupAreaLabel: string;
  vehiclePowerType: string;
  roadDistanceM: number;
  etaSeconds: number;
  requestVersion: number;
  expiresAt: string;
}

export interface ProviderStatistics {
  completedCases: number;
  activeCases: number;
  cancelledCases: number;
  rating: RatingSummary;
}

export interface ProviderStatus {
  available: boolean;
  teamName: string;
  status: string;
  teamRating: RatingSummary;
  qualityWarningCount: number;
  suspensionReviewRecommended: boolean;
  qualityNotice: string | null;
  teamStatus: 'pending' | 'verified' | 'suspended';
  shopLatitude: number | null;
  shopLongitude: number | null;
  shopInServiceArea: boolean;
  shopAddress: string | null;
}

export interface TeamSummary {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'suspended';
  activeProviders: number;
  capabilityCodes: string[];
  rating: RatingSummary;
  qualityWarningCount: number;
  suspensionReviewRecommended: boolean;
  activeQualityAlert: QualityAlertSummary | null;
  baseLatitude: number | null;
  baseLongitude: number | null;
  baseAddress: string | null;
  shopInServiceArea: boolean;
}

export interface ProviderMember {
  userId: string;
  displayName: string;
  contactPhone: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended' | 'left';
  available: boolean;
  rescueVehicleLabel: string | null;
  locationUpdatedAt: string | null;
}

export interface ProviderDirectoryEntry {
  userId: string;
  displayName: string;
  teamId: string | null;
  teamName: string | null;
  teamStatus: TeamSummary['status'] | null;
  status: ProviderMember['status'] | 'unassigned';
  accountActive: boolean;
  available: boolean;
}

export interface AuditLogEntry {
  id: number;
  actorDisplayName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface AccountLookup {
  id: string;
  displayName: string;
  role: 'customer' | 'provider' | 'admin';
}

export interface TeamVerificationCheck {
  code: string;
  labelVi: string;
  descriptionVi: string;
  labelEn: string;
  descriptionEn: string;
  required: boolean;
  completed: boolean;
  note: string | null;
  checkedByName: string | null;
  checkedAt: string | null;
}

export interface TeamVerification {
  teamId: string;
  teamName: string;
  status: 'pending' | 'verified' | 'suspended';
  partnerReference: string;
  verifiedByName: string | null;
  verifiedAt: string | null;
  activeProviderCount: number;
  capabilityCount: number;
  completedRequiredCount: number;
  requiredCount: number;
  readyToVerify: boolean;
  shopInServiceArea: boolean;
  checks: TeamVerificationCheck[];
}

export interface UpdateTeamVerificationInput {
  partnerReference: string;
  checks: { code: string; completed: boolean; note?: string }[];
}

export interface CreateRescueInput {
  serviceCode: string;
  vehiclePowerType: 'gasoline';
  vehicleDescription?: string;
  pickupAreaLabel: string;
  pickupNote?: string;
  latitude: number;
  longitude: number;
  pickupSource: 'gps' | 'manual' | 'geocoded';
  pickupAccuracyM?: number;
  destinationAreaLabel?: string;
  destinationNote?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  hasInjury: boolean;
  hasImmediateHazard: boolean;
  safetyAcknowledged: boolean;
}
