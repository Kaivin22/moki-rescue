import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

export interface AppInfo {
  name: string;
  version: string;
  build: string | null;
}

export function getAppInfo(): AppInfo {
  const config = Constants.expoConfig;
  const runningInExpoGo = Boolean(Constants.expoGoConfig);
  const configuredBuild = Platform.OS === 'ios'
    ? config?.ios?.buildNumber
    : Platform.OS === 'android'
      ? config?.android?.versionCode
      : null;

  const nativeVersion = runningInExpoGo ? null : Application.nativeApplicationVersion;
  const nativeBuild = runningInExpoGo ? null : Application.nativeBuildVersion;

  return {
    name: config?.name?.trim() || 'Ứng dụng',
    version: nativeVersion?.trim() || config?.version?.trim() || 'Không xác định',
    build: nativeBuild ?? (configuredBuild === null || configuredBuild === undefined
      ? null
      : String(configuredBuild)),
  };
}

export function getAppVersionLabel(): string {
  const info = getAppInfo();
  return `${info.name} v${info.version}${info.build ? ` (${info.build})` : ''}`;
}
