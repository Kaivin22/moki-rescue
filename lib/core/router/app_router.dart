
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../supabase/supabase_service.dart';

import '../../features/auth/presentation/screens/email_sent_screen.dart';
import '../../features/auth/presentation/screens/forgot_password_screen.dart';
import '../../features/auth/presentation/screens/google_signin_loading_screen.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/onboarding_screen.dart';
import '../../features/auth/presentation/screens/profile_setup_screen.dart';
import '../../features/auth/presentation/screens/register_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';

import '../../features/place/presentation/screens/home_screen.dart';
import '../../features/place/presentation/screens/home_screen_anonymous.dart';
import '../../features/place/presentation/screens/discover_screen.dart';
import '../../features/place/presentation/screens/search_result_screen.dart';
import '../../features/place/presentation/screens/place_detail_screen.dart';
import '../../features/place/presentation/screens/place_photos_screen.dart';
import '../../features/place/presentation/screens/report_place_screen.dart';

import '../../features/review/presentation/screens/review_list_screen.dart';
import '../../features/review/presentation/screens/write_review_screen.dart';

import '../../features/explore/presentation/screens/explore_screen.dart';

import '../../features/itinerary/presentation/screens/create_itinerary_screen.dart';
import '../../features/itinerary/presentation/screens/add_places_screen.dart';
import '../../features/itinerary/presentation/screens/arrange_schedule_screen.dart';
import '../../features/itinerary/presentation/screens/itinerary_detail_screen.dart';
import '../../features/itinerary/presentation/screens/my_itineraries_screen.dart';
import '../../features/itinerary/presentation/screens/edit_schedule_screen.dart';
import '../../features/itinerary/presentation/screens/public_itinerary_screen.dart';
import '../../features/itinerary/presentation/screens/share_itinerary_screen.dart';
import '../../features/itinerary/presentation/screens/trip_history_screen.dart';

import '../../features/map/presentation/screens/map_screen.dart';

import '../../features/ai/presentation/screens/ai_chat_screen.dart';
import '../../features/ai/presentation/screens/budget_calculator_screen.dart';
import '../../features/ai/presentation/screens/weather_widget_screen.dart';

import '../../features/profile/presentation/screens/profile_screen.dart';
import '../../features/profile/presentation/screens/edit_profile_screen.dart';
import '../../features/profile/presentation/screens/settings_screen.dart';
import '../../features/profile/presentation/screens/saved_places_screen.dart';
import '../../features/profile/presentation/screens/follower_list_screen.dart';
import '../../features/profile/presentation/screens/user_public_profile_screen.dart';

import '../../features/community/presentation/screens/community_feed_screen.dart';
import '../../features/community/presentation/screens/leaderboard_screen.dart';

import '../../features/notifications/presentation/screens/notification_detail_screen.dart';

import '../../features/support/presentation/screens/help_center_screen.dart';
import '../../features/support/presentation/screens/feedback_screen.dart';
import '../../features/support/presentation/screens/privacy_policy_screen.dart';
import '../../features/support/presentation/screens/terms_of_service_screen.dart';
import '../../features/support/presentation/screens/support_screen.dart';
import '../../features/support/presentation/screens/new_ticket_screen.dart';
import '../../features/support/presentation/screens/ticket_detail_screen.dart';
import '../../features/vip/presentation/screens/vip_screen.dart';
import '../../features/vip/presentation/screens/payment_screen.dart';
import '../../features/vip/presentation/screens/payment_result_screens.dart';
import '../../features/profile/presentation/screens/travel_preferences_screen.dart';
import '../../features/admin/presentation/screens/admin_dashboard_screen.dart';
import '../../features/admin/presentation/screens/admin_places_screen.dart';
import '../../features/admin/presentation/screens/admin_edit_place_screen.dart';
import '../../features/admin/presentation/screens/admin_users_screen.dart';
import '../../features/admin/presentation/screens/admin_user_detail_screen.dart';
import '../../features/admin/presentation/screens/admin_tickets_screen.dart';
import '../../features/admin/presentation/screens/admin_ticket_detail_screen.dart';
import '../../features/admin/presentation/screens/admin_analytics_screen.dart';
import '../../features/admin/presentation/screens/admin_sync_screen.dart';
import '../../features/editor/presentation/screens/editor_dashboard_screen.dart';
import '../../features/editor/presentation/screens/editor_places_screen.dart';
import '../../features/editor/presentation/screens/editor_edit_place_screen.dart';
import '../../features/editor/presentation/screens/add_new_place_screen.dart';

/// ═══════════════════════════════════════════════════════
/// AppRouter — go_router 15.x configuration
/// All 47 screens wired. ShellRoute drives tab navigation.
/// ═══════════════════════════════════════════════════════

/// Routes yêu cầu đăng nhập — redirect về /login nếu chưa auth
const _authRequiredRoutes = [
  AppRoutes.home,
  AppRoutes.myItineraries,
  AppRoutes.createItinerary,
  AppRoutes.addPlaces,
  AppRoutes.arrangeSchedule,
  AppRoutes.editSchedule,
  AppRoutes.shareItinerary,
  AppRoutes.tripHistory,
  AppRoutes.profile,
  AppRoutes.editProfile,
  AppRoutes.settings,
  AppRoutes.savedPlaces,
  AppRoutes.aiChat,
  AppRoutes.writeReview,
  AppRoutes.feedback,
];

/// RouteGuard: kiểm tra auth, redirect nếu cần
String? _routeGuard(GoRouterState state) {
  final isAuthenticated = SupabaseService.isAuthenticated;
  final path = state.matchedLocation;

  // Redirect user đã đăng nhập khỏi trang auth về home
  final authOnlyPaths = [AppRoutes.login, AppRoutes.register, AppRoutes.onboarding];
  if (isAuthenticated && authOnlyPaths.contains(path)) {
    return AppRoutes.home;
  }

  // Redirect user chưa đăng nhập khỏi trang cần auth về login
  final needsAuth = _authRequiredRoutes.any((r) => path.startsWith(r));
  if (!isAuthenticated && needsAuth) {
    return '${AppRoutes.login}?redirect=${Uri.encodeComponent(path)}';
  }

  // ── Role guards ──
  final role = SupabaseService.currentUserRole;
  if (path.startsWith(AppRoutes.admin)) {
    if (!isAuthenticated) {
      return '${AppRoutes.login}?redirect=${Uri.encodeComponent(path)}';
    }
    if (role != 'admin') return AppRoutes.home;
  }
  if (path.startsWith(AppRoutes.editor)) {
    if (!isAuthenticated) {
      return '${AppRoutes.login}?redirect=${Uri.encodeComponent(path)}';
    }
    if (role != 'admin' && role != 'editor') return AppRoutes.home;
  }

  return null; // Không cần redirect
}

/// ValueNotifier theo dõi thay đổi auth state để GoRouter refresh.
/// Được main.dart lắng nghe và cập nhật khi auth state thay đổi.
final authNotifier = ValueNotifier<AuthState?>(null);

final appRouter = GoRouter(
  initialLocation: AppRoutes.splash,
  debugLogDiagnostics: kDebugMode,
  redirect: (context, state) => _routeGuard(state),
  refreshListenable: authNotifier,

  routes: [

    // ── Auth / Onboarding ──────────────────────────────
    GoRoute(
      path: AppRoutes.splash,
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboarding,
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: AppRoutes.login,
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: AppRoutes.register,
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: AppRoutes.forgotPassword,
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: AppRoutes.emailSent,
      builder: (context, state) => EmailSentScreen(
        email: state.uri.queryParameters['email'] ?? '',
      ),
    ),
    GoRoute(
      path: AppRoutes.googleSignInLoading,
      builder: (context, state) => const GoogleSignInLoadingScreen(),
    ),
    GoRoute(
      path: AppRoutes.profileSetup,
      builder: (context, state) => const ProfileSetupScreen(),
    ),

    // ── Main bottom-nav tabs (no ShellRoute — each tab navigates independently) ─
    GoRoute(path: AppRoutes.home,           builder: (c, s) => const HomeScreen()),
    GoRoute(path: AppRoutes.homeAnonymous,  builder: (c, s) => const HomeScreenAnonymous()),
    GoRoute(path: AppRoutes.explore,        builder: (c, s) => const ExploreScreen()),
    GoRoute(path: AppRoutes.myItineraries,  builder: (c, s) => const MyItinerariesScreen()),
    GoRoute(path: AppRoutes.communityFeed,  builder: (c, s) => const CommunityFeedScreen()),
    GoRoute(path: AppRoutes.profile,        builder: (c, s) => const ProfileScreen()),

    // ── Discover / Search ─────────────────────────────
    GoRoute(
      path: AppRoutes.discover,
      builder: (context, state) => const DiscoverScreen(),
    ),
    GoRoute(
      path: AppRoutes.searchResult,
      builder: (context, state) => SearchResultScreen(
        initialQuery: state.uri.queryParameters['q'] ?? '',
      ),
    ),

    // ── Place Detail ──────────────────────────────────
    GoRoute(
      path: '${AppRoutes.placeDetail}/:placeId',
      builder: (context, state) => PlaceDetailScreen(
        placeId: state.pathParameters['placeId']!,
      ),
    ),
    GoRoute(
      path: '${AppRoutes.placePhotos}/:placeId',
      builder: (context, state) => PlacePhotosScreen(
        placeId: state.pathParameters['placeId'],
        placeName: state.uri.queryParameters['name'] ?? '',
      ),
    ),
    GoRoute(
      path: '${AppRoutes.reviewList}/:placeId',
      builder: (context, state) => ReviewListScreen(
        placeId: state.pathParameters['placeId'],
      ),
    ),
    GoRoute(
      path: '${AppRoutes.writeReview}/:placeId',
      builder: (context, state) => WriteReviewScreen(
        placeId: state.pathParameters['placeId']!,
        placeName: state.uri.queryParameters['name'] ?? '',
      ),
    ),
    GoRoute(
      path: '${AppRoutes.reportPlace}/:placeId',
      builder: (context, state) => ReportPlaceScreen(
        placeId: state.pathParameters['placeId']!,
        placeName: state.uri.queryParameters['name'] ?? '',
      ),
    ),

    // ── Itinerary ─────────────────────────────────────
    GoRoute(
      path: AppRoutes.createItinerary,
      builder: (context, state) => const CreateItineraryScreen(),
    ),
    GoRoute(
      path: AppRoutes.addPlaces,
      builder: (context, state) => AddPlacesScreen(
        numDays: int.tryParse(state.uri.queryParameters['days'] ?? '3') ?? 3,
      ),
    ),
    GoRoute(
      path: AppRoutes.arrangeSchedule,
      builder: (context, state) => ArrangeScheduleScreen(
        numDays: int.tryParse(state.uri.queryParameters['days'] ?? '3') ?? 3,
        placeIds: (state.uri.queryParameters['places'] ?? '')
            .split(',')
            .where((s) => s.isNotEmpty)
            .toList(),
      ),
    ),
    GoRoute(
      path: '${AppRoutes.itineraryDetail}/:id',
      builder: (context, state) => ItineraryDetailScreen(
        itineraryId: state.pathParameters['id']!,
        title: state.uri.queryParameters['title'],
        imageUrl: state.uri.queryParameters['img'],
        isOwner: state.uri.queryParameters['owner'] == 'true',
      ),
    ),
    GoRoute(
      path: '${AppRoutes.editSchedule}/:id',
      builder: (context, state) => EditScheduleScreen(
        itineraryId: state.pathParameters['id']!,
        itineraryTitle: state.uri.queryParameters['title'] ?? '',
        numDays: int.tryParse(state.uri.queryParameters['days'] ?? '3') ?? 3,
      ),
    ),
    GoRoute(
      path: '${AppRoutes.publicItinerary}/:id',
      builder: (context, state) => PublicItineraryScreen(
        itineraryId: state.pathParameters['id']!,
        shareToken: state.uri.queryParameters['token'],
      ),
    ),
    GoRoute(
      path: '${AppRoutes.shareItinerary}/:id',
      builder: (context, state) => ShareItineraryScreen(
        itineraryId: state.pathParameters['id']!,
        itineraryTitle: state.uri.queryParameters['title'] ?? '',
      ),
    ),
    GoRoute(
      path: AppRoutes.tripHistory,
      builder: (context, state) => const TripHistoryScreen(),
    ),

    // ── Map ───────────────────────────────────────────
    GoRoute(
      path: AppRoutes.map,
      builder: (context, state) => MapScreen(
        initialPlaceId: state.uri.queryParameters['placeId'],
      ),
    ),

    // ── AI ────────────────────────────────────────────
    GoRoute(
      path: AppRoutes.aiChat,
      builder: (context, state) => AIChatScreen(
        initialPrompt: state.uri.queryParameters['prompt'],
      ),
    ),
    GoRoute(
      path: AppRoutes.budgetCalculator,
      builder: (context, state) => const BudgetCalculatorScreen(),
    ),
    GoRoute(
      path: AppRoutes.weather,
      builder: (context, state) => const WeatherWidgetScreen(),
    ),

    // ── Profile ───────────────────────────────────────
    GoRoute(
      path: AppRoutes.editProfile,
      builder: (context, state) => const EditProfileScreen(),
    ),
    GoRoute(
      path: AppRoutes.settings,
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: AppRoutes.savedPlaces,
      builder: (context, state) => const SavedPlacesScreen(),
    ),
    GoRoute(
      path: '${AppRoutes.followers}/:userId',
      builder: (context, state) => FollowerListScreen(
        userId: state.pathParameters['userId']!,
        displayName: state.uri.queryParameters['name'] ?? '',
        initialTab: int.tryParse(state.uri.queryParameters['tab'] ?? '0') ?? 0,
      ),
    ),
    GoRoute(
      path: '${AppRoutes.userProfile}/:userId',
      builder: (context, state) => UserPublicProfileScreen(
        userId: state.pathParameters['userId']!,
        displayName: state.uri.queryParameters['name'] ?? '',
        avatarUrl: state.uri.queryParameters['avatar'],
      ),
    ),

    // ── Community ─────────────────────────────────────
    GoRoute(
      path: AppRoutes.leaderboard,
      builder: (context, state) => const LeaderboardScreen(),
    ),

    // ── Notifications ─────────────────────────────────
    GoRoute(
      path: '${AppRoutes.notificationDetail}/:type',
      builder: (context, state) => NotificationDetailScreen(
        type: _parseNotifType(state.pathParameters['type']),
        title: state.uri.queryParameters['title'] ?? '',
        body: state.uri.queryParameters['body'] ?? '',
        timestamp: DateTime.tryParse(state.uri.queryParameters['ts'] ?? '') ?? DateTime.now(),
        imageUrl: state.uri.queryParameters['img'],
        actionLabel: state.uri.queryParameters['action'],
      ),
    ),

    // ── Support ───────────────────────────────────────
    GoRoute(path: AppRoutes.helpCenter,     builder: (c, s) => const HelpCenterScreen()),
    GoRoute(path: AppRoutes.feedback,       builder: (c, s) => const FeedbackScreen()),
    GoRoute(path: AppRoutes.privacyPolicy,  builder: (c, s) => const PrivacyPolicyScreen()),
    GoRoute(path: AppRoutes.termsOfService, builder: (c, s) => const TermsOfServiceScreen()),

    // ── VIP + Payment ─────────────────────────────────────────────────
    GoRoute(path: AppRoutes.vip,           builder: (c, s) => const VipScreen()),
    GoRoute(path: AppRoutes.payment,       builder: (c, s) => const PaymentScreen()),
    GoRoute(path: AppRoutes.paymentSuccess, builder: (c, s) => const PaymentSuccessScreen()),
    GoRoute(path: AppRoutes.paymentFailed,  builder: (c, s) => const PaymentFailedScreen()),

    // ── Support Tickets ──────────────────────────────────────────────
    GoRoute(path: AppRoutes.support,       builder: (c, s) => const SupportScreen()),
    GoRoute(path: AppRoutes.newTicket,     builder: (c, s) => const NewTicketScreen()),
    GoRoute(
      path: '${AppRoutes.ticketDetail}/:id',
      builder: (c, s) => TicketDetailScreen(
        ticketId: s.pathParameters['id']!,
      ),
    ),

    // ── Profile Polish ──────────────────────────────────────────────
    GoRoute(path: AppRoutes.travelPreferences, builder: (c, s) => const TravelPreferencesScreen()),

    // ── Admin ───────────────────────────────────────────────────
    GoRoute(path: AppRoutes.admin,           builder: (c, s) => const AdminDashboardScreen()),
    GoRoute(path: AppRoutes.adminPlaces,     builder: (c, s) => const AdminPlacesScreen()),
    GoRoute(
      path: '${AppRoutes.adminPlaces}/:id/edit',
      builder: (c, s) => AdminEditPlaceScreen(
        placeId: s.pathParameters['id']!,
      ),
    ),
    GoRoute(path: AppRoutes.adminUsers,      builder: (c, s) => const AdminUsersScreen()),
    GoRoute(
      path: '${AppRoutes.adminUsers}/:userId',
      builder: (c, s) => AdminUserDetailScreen(
        userId: s.pathParameters['userId']!,
        displayName: s.uri.queryParameters['name'] ?? '',
      ),
    ),
    GoRoute(path: AppRoutes.adminTickets,    builder: (c, s) => const AdminTicketsScreen()),
    GoRoute(
      path: '${AppRoutes.adminTickets}/:id',
      builder: (c, s) => AdminTicketDetailScreen(
        ticketId: s.pathParameters['id']!,
      ),
    ),
    GoRoute(path: AppRoutes.adminAnalytics,  builder: (c, s) => const AdminAnalyticsScreen()),
    GoRoute(path: AppRoutes.adminSync,       builder: (c, s) => const AdminSyncScreen()),

    // ── Editor ────────────────────────────────────────────────
    GoRoute(path: AppRoutes.editor,          builder: (c, s) => const EditorDashboardScreen()),
    GoRoute(path: AppRoutes.editorPlaces,    builder: (c, s) => const EditorPlacesScreen()),
    GoRoute(
      path: '${AppRoutes.editorPlaces}/:id/edit',
      builder: (c, s) => EditorEditPlaceScreen(
        placeId: s.pathParameters['id']!,
      ),
    ),
    GoRoute(path: AppRoutes.editorPlacesNew, builder: (c, s) => const AddNewPlaceScreen()),
  ],
);

NotifType _parseNotifType(String? s) => switch (s) {
  'trip'      => NotifType.trip,
  'review'    => NotifType.review,
  'follow'    => NotifType.follow,
  'promotion' => NotifType.promotion,
  _           => NotifType.system,
};

// ── Route path constants ──────────────────────────────
abstract final class AppRoutes {
  // Auth
  static const splash            = '/';
  static const onboarding        = '/onboarding';
  static const login             = '/login';
  static const register          = '/register';
  static const forgotPassword    = '/forgot-password';
  static const emailSent         = '/email-sent';
  static const googleSignInLoading = '/google-signin';
  static const profileSetup      = '/profile-setup';

  // Main tabs
  static const home              = '/home';
  static const homeAnonymous     = '/home-guest';
  static const explore           = '/explore';
  static const myItineraries     = '/my-itineraries';
  static const communityFeed     = '/community';
  static const profile           = '/profile';

  // Discover / Search
  static const discover          = '/discover';
  static const searchResult      = '/search';

  // Place
  static const placeDetail       = '/place';
  static const placePhotos       = '/place-photos';
  static const reviewList        = '/reviews';
  static const writeReview       = '/write-review';
  static const reportPlace       = '/report-place';

  // Itinerary
  static const createItinerary   = '/create-itinerary';
  static const addPlaces         = '/add-places';
  static const arrangeSchedule   = '/arrange-schedule';
  static const itineraryDetail   = '/itinerary';
  static const editSchedule      = '/edit-schedule';
  static const publicItinerary   = '/shared-itinerary';
  static const shareItinerary    = '/share-itinerary';
  static const tripHistory       = '/trip-history';

  // Map
  static const map               = '/map';

  // AI
  static const aiChat            = '/ai-chat';
  static const budgetCalculator  = '/budget';
  static const weather           = '/weather';

  // Profile
  static const editProfile       = '/edit-profile';
  static const settings          = '/settings';
  static const savedPlaces       = '/saved';
  static const followers         = '/followers';
  static const userProfile       = '/user';

  // Community
  static const leaderboard       = '/leaderboard';

  // Notifications
  static const notificationDetail = '/notification';

  // Support
  static const helpCenter        = '/help';
  static const feedback          = '/feedback';
  static const privacyPolicy     = '/privacy';
  static const termsOfService    = '/terms';
  static const support           = '/support';
  static const newTicket         = '/support/new';
  static const ticketDetail      = '/support/ticket';

  // VIP + Payment
  static const vip               = '/vip';
  static const payment           = '/payment';
  static const paymentSuccess    = '/payment/success';
  static const paymentFailed     = '/payment/failed';

  // Profile Polish
  static const travelPreferences = '/travel-preferences';

  // Admin Panel
  static const admin             = '/admin';
  static const adminPlaces       = '/admin/places';
  static const adminUsers        = '/admin/users';
  static const adminTickets      = '/admin/tickets';
  static const adminAnalytics    = '/admin/analytics';
  static const adminSync         = '/admin/sync';

  // Editor Panel
  static const editor            = '/editor';
  static const editorPlaces      = '/editor/places';
  static const editorPlacesNew   = '/editor/places/new';
}
