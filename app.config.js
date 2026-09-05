const isProductionBuild =
  process.env.APP_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
const mapsKey = process.env.GOOGLE_MAPS_KEY || '';
const supportHotline = process.env.EXPO_PUBLIC_SUPPORT_HOTLINE || '';
const serviceCenterLatitude = process.env.EXPO_PUBLIC_SERVICE_CENTER_LATITUDE || '';
const serviceCenterLongitude = process.env.EXPO_PUBLIC_SERVICE_CENTER_LONGITUDE || '';
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '';
const brand = {
  canvas: '#F7FBFD',
  lime: '#DDF186',
};

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
    ['EXPO_PUBLIC_SERVICE_CENTER_LATITUDE', serviceCenterLatitude],
    ['EXPO_PUBLIC_SERVICE_CENTER_LONGITUDE', serviceCenterLongitude],
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
  const centerLatitude = Number(serviceCenterLatitude);
  const centerLongitude = Number(serviceCenterLongitude);
  if (
    !Number.isFinite(centerLatitude) ||
    centerLatitude < -90 ||
    centerLatitude > 90 ||
    !Number.isFinite(centerLongitude) ||
    centerLongitude < -180 ||
    centerLongitude > 180
  ) {
    throw new Error('The public service center must contain valid latitude and longitude values.');
  }
}

export default {
  expo: {
    name: 'Moki Rescue',
    slug: 'moki-rescue',
    description: 'Điều phối cứu hộ xe máy theo thời gian thực cho mạng lưới đối tác được xác minh.',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/branding/moki-rescue-logo.png',
    userInterfaceStyle: 'light',
    locales: {
      vi: './locales/vi.json',
      en: './locales/en.json',
    },
    // Preserve installed-app identity and existing deep links across the visual rebrand.
    scheme: 'motorescue',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.danang.motorescue',
      buildNumber: '1',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: brand.canvas,
        foregroundImage: './assets/branding/moki-rescue-logo.png',
      },
      package: 'com.danang.motorescue',
      versionCode: 1,
      predictiveBackGestureEnabled: true,
      config: {
        googleMaps: { apiKey: mapsKey },
      },
    },
    web: { favicon: './assets/branding/moki-rescue-logo.png' },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Moki Rescue dùng vị trí khi khách tạo ca hoặc khi cứu hộ viên bật sẵn sàng nhận ca hay đang xử lý ca. Tắt sẵn sàng và kết thúc ca để dừng theo dõi.',
          locationAlwaysAndWhenInUsePermission:
            'Cứu hộ viên có thể cho phép cập nhật vị trí trong nền khi bật sẵn sàng nhận ca hoặc đang xử lý ca. Tắt sẵn sàng để dừng vị trí chờ ca. Khách hàng không cần quyền này.',
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/branding/moki-rescue-notification-icon.png',
          color: brand.lime,
          defaultChannel: 'rescue-updates',
        },
      ],
    ],
    extra: {
      supabaseUrl,
      supabaseAnonKey,
      apiUrl,
      supportHotline,
      serviceCenterLatitude,
      serviceCenterLongitude,
      appEnvironment: process.env.APP_ENV || 'development',
      ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
    },
    runtimeVersion: { policy: 'appVersion' },
  },
};
