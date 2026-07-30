export default {
  "expo": {
    "name": "Lịch Trình Đà Nẵng",
    "slug": "danang-itinerary",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "danangitinerary",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.danang.itinerary"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#144425",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "package": "com.danang.itinerary",
      "predictiveBackGestureEnabled": true,
      "config": {
        "googleMaps": {
          "apiKey": process.env.GOOGLE_MAPS_KEY || ""
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
      "@react-native-community/datetimepicker"
    ],
    "extra": {
      "supabaseUrl": process.env.SUPABASE_URL || "",
      "supabaseAnonKey": process.env.SUPABASE_ANON_KEY || "",
      "geminiApiKey": process.env.GEMINI_API_KEY || "",
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
};
