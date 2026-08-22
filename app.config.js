const isProductionBuild =
  process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
const mapsKey = process.env.GOOGLE_MAPS_KEY || '';
const supportHotline = process.env.EXPO_PUBLIC_SUPPORT_HOTLINE || '';
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '';

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

if (isProductionBuild) {
  const missing = [
    ['EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY],
    ['EXPO_PUBLIC_API_URL', apiUrl],
    ['GOOGLE_MAPS_KEY', mapsKey],
    ['EXPO_PUBLIC_SUPPORT_HOTLINE', supportHotline],
    ['EXPO_PUBLIC_EAS_PROJECT_ID', easProjectId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
  if (!isHttpsUrl(supabaseUrl) || !isHttpsUrl(apiUrl)) {
    throw new Error('Production Supabase and API URLs must use HTTPS and cannot point to localhost.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(easProjectId)) {
    throw new Error('EXPO_PUBLIC_EAS_PROJECT_ID must be a valid UUID.');
  }
  if (!/^\+?[0-9]{6,15}$/.test(supportHotline)) {
    throw new Error('EXPO_PUBLIC_SUPPORT_HOTLINE must contain 6-15 digits, with an optional leading +.');
  }
}

export default {
  expo: {
    name: 'MotoRescue Đà Nẵng',
    slug: 'motorescue-danang',
    description: 'Điều phối cứu hộ xe máy theo thời gian thực cho mạng lưới đối tác được xác minh.',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/motorescue-icon-opaque.png',
    userInterfaceStyle: 'light',
    scheme: 'motorescue',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.danang.motorescue',
      buildNumber: '1',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0B1F33',
        foregroundImage: './assets/motorescue-icon-opaque.png',
      },
      package: 'com.danang.motorescue',
      versionCode: 1,
      predictiveBackGestureEnabled: true,
      config: {
        googleMaps: { apiKey: mapsKey },
      },
    },
    web: { favicon: './assets/motorescue-icon-opaque.png' },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'MotoRescue dùng vị trí khi bạn tạo hoặc đang xử lý một yêu cầu cứu hộ. Vị trí không được theo dõi khi không có ca hoạt động.',
          locationAlwaysAndWhenInUsePermission:
            'Cứu hộ viên cho phép MotoRescue cập nhật vị trí trong nền chỉ khi đang xử lý một ca. Khách hàng không cần cấp quyền này.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/motorescue-notification-icon.png',
          color: '#F5B942',
          defaultChannel: 'rescue-updates',
        },
      ],
    ],
    extra: {
      supabaseUrl,
      supabaseAnonKey,
      apiUrl,
      supportHotline,
      appEnvironment: process.env.APP_ENV || 'development',
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
    runtimeVersion: { policy: 'appVersion' },
  },
};
