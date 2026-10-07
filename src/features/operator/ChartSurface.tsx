import { WebView } from 'react-native-webview';

export function ChartSurface({ html, label }: { html: string; label: string }) {
  return (
    <WebView
      source={{ html }}
      containerStyle={{ height: 210, flex: 0 }}
      style={{ backgroundColor: 'transparent' }}
      accessibilityLabel={label}
      originWhitelist={['*']}
      javaScriptEnabled={false}
      scrollEnabled={false}
      mixedContentMode="never"
      allowFileAccess={false}
      onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
    />
  );
}
