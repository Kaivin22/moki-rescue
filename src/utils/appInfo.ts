import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getAppVersionLabel(): string {
  const config = Constants.expoConfig;
  const expoGo = Boolean(Constants.expoGoConfig);
  const configuredBuild = Platform.OS === 'ios' ? config?.ios?.buildNumber : config?.android?.versionCode;
  const version = expoGo ? config?.version : Application.nativeApplicationVersion;
  const build = expoGo ? configuredBuild : Application.nativeBuildVersion;
  return `${config?.name ?? 'Moki Rescue'} v${version ?? '1.0.0'}${build ? ` (${build})` : ''}`;
}
