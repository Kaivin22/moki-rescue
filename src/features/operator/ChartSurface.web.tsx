export function ChartSurface({ html, label }: { html: string; label: string }) {
  return <iframe title={label} srcDoc={html} sandbox="" style={{ border: 0, width: '100%', height: 210 }} />;
}
