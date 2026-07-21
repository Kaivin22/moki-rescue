import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/supabase/supabase_service.dart';
import 'core/theme/app_theme.dart';

/// ─────────────────────────────────────────────
/// Entry point — thứ tự khởi tạo:
///   1. Flutter binding
///   2. Load biến môi trường từ .env
///   3. Khởi tạo Supabase (URL + AnonKey từ .env)
///   4. Lắng nghe auth state → refresh GoRouter
///   5. runApp với ProviderScope
/// ─────────────────────────────────────────────
Future<void> main() async {
  // Đảm bảo Flutter binding được khởi tạo trước khi gọi native code
  WidgetsFlutterBinding.ensureInitialized();

  // Load file .env (được khai báo trong pubspec.yaml assets)
  await dotenv.load(fileName: '.env');

  // Khởi tạo kết nối Supabase
  await SupabaseService.initialize();

  // Lắng nghe thay đổi trạng thái auth → trigger router refresh
  SupabaseService.authStateChanges.listen((authState) {
    authNotifier.value = authState;
  });


  runApp(
    const ProviderScope(
      child: DaNangItineraryApp(),
    ),
  );
}

/// Root widget của ứng dụng
class DaNangItineraryApp extends StatelessWidget {
  const DaNangItineraryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'DaNang Itinerary',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}
