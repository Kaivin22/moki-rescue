const isProductionBuild =
  process.env.APP_ENV === 'production' ||
  process.env.EAS_BUILD_PROFILE === 'production';

// Legacy fallbacks keep the current SDK 54 Expo Go workflow usable while the
// local .env is migrated. Only the Supabase URL and anon key are allowed here;
// neither value is a server-side secret.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
const mapsKey = process.env.GOOGLE_MAPS_KEY || '';
const weatherApiUrl = process.env.EXPO_PUBLIC_WEATHER_API_URL || '';
const osrmCarBaseUrl = process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL || process.env.EXPO_PUBLIC_OSRM_BASE_URL || '';
const osrmMotorbikeBaseUrl = process.env.EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL || '';
const osrmWalkBaseUrl = process.env.EXPO_PUBLIC_OSRM_WALK_BASE_URL || '';
const osrmBicycleBaseUrl = process.env.EXPO_PUBLIC_OSRM_BICYCLE_BASE_URL || '';

if (isProductionBuild) {
  const missing = [
    // Production must use the canonical public names; legacy fallbacks above
    // exist only to keep an older local SDK 54 .env usable during migration.
    ['EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL],
    ['EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY],
    ['EXPO_PUBLIC_API_URL', apiUrl],
    ['GOOGLE_MAPS_KEY', mapsKey],
    ['EXPO_PUBLIC_WEATHER_API_URL', weatherApiUrl],
    ['EXPO_PUBLIC_OSRM_CAR_BASE_URL', process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL],
    ['EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL', osrmMotorbikeBaseUrl],
    ['EXPO_PUBLIC_OSRM_WALK_BASE_URL', osrmWalkBaseUrl],
    ['EXPO_PUBLIC_OSRM_BICYCLE_BASE_URL', osrmBicycleBaseUrl],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
}

export default {
  "expo": {
    "name": "Đi Đà Nẵng",
    "slug": "danang-itinerary",
    "description": "Khám phá địa điểm, lập lịch trình và tối ưu đường đi tại Đà Nẵng.",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "danangitinerary",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.danang.itinerary",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#144425",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "package": "com.danang.itinerary",
      "versionCode": 1,
      "predictiveBackGestureEnabled": true,
      "config": {
        "googleMaps": {
          "apiKey": mapsKey
        }
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-secure-store",
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Cho phép Đi Đà Nẵng dùng vị trí để tính khoảng cách tới địa điểm."
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Cho phép Đi Đà Nẵng chọn ảnh thật cho thông tin địa điểm.",
          "microphonePermission": false
        }
      ],
      "@react-native-community/datetimepicker"
    ],
    "extra": {
      // Only public configuration may be embedded in the client bundle.
      // Never add server-side secrets (for example GEMINI_API_KEY) here.
      "supabaseUrl": supabaseUrl,
      "supabaseAnonKey": supabaseAnonKey,
      "apiUrl": apiUrl,
      "weatherApiUrl": weatherApiUrl,
      "routingBaseUrls": {
        "car": osrmCarBaseUrl,
        "motorbike": osrmMotorbikeBaseUrl,
        "walk": osrmWalkBaseUrl,
        "bicycle": osrmBicycleBaseUrl
      },
      "appEnvironment": process.env.APP_ENV || 'development',
      ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        ? { "eas": { "projectId": process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
        : {})
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
};
