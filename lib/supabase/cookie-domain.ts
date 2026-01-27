export function resolveCookieDomain(host: string | null | undefined, cookieDomain?: string | null) {
  if (!cookieDomain) return undefined;
  const normalized = cookieDomain.startsWith(".") ? cookieDomain.slice(1) : cookieDomain;
  if (!host) return undefined;
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === normalized || hostname.endsWith(`.${normalized}`)) {
    return cookieDomain.startsWith(".") ? cookieDomain : `.${normalized}`;
  }
  return undefined;
}
