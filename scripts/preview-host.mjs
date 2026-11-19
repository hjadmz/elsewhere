export const previewHost = '127.0.0.1';

export function matchesPreviewHost(hostHeaders, port) {
  if (hostHeaders?.length !== 1) return false;
  const [authority] = hostHeaders;
  return authority === `${previewHost}:${port}` || (port === 80 && authority === previewHost);
}
