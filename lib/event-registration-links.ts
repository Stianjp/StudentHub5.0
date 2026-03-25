const PUBLIC_EVENT_REGISTER_FALLBACK_PATH = "/event-register";

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function trimTrailingSlash(value: string) {
  if (value.length > 1 && value.endsWith("/")) {
    return value.slice(0, -1);
  }
  return value;
}

function deriveLandingPathname(pathname: string) {
  const normalizedPath = trimTrailingSlash(pathname);
  const separatorIndex = normalizedPath.lastIndexOf("/");
  if (separatorIndex <= 0) {
    return "/";
  }
  return normalizedPath.slice(0, separatorIndex);
}

export function resolvePublicRegistrationCampaignHref(registrationFormUrl: string | null | undefined, slug: string) {
  if (!registrationFormUrl) {
    return `${PUBLIC_EVENT_REGISTER_FALLBACK_PATH}/${slug}`;
  }

  if (isAbsoluteUrl(registrationFormUrl)) {
    return registrationFormUrl;
  }

  return trimTrailingSlash(registrationFormUrl);
}

export function resolvePublicRegistrationLandingHref(registrationFormUrl: string | null | undefined) {
  if (!registrationFormUrl) {
    return PUBLIC_EVENT_REGISTER_FALLBACK_PATH;
  }

  if (isAbsoluteUrl(registrationFormUrl)) {
    const url = new URL(registrationFormUrl);
    url.pathname = deriveLandingPathname(url.pathname);
    url.search = "";
    url.hash = "";
    return url.toString();
  }

  return deriveLandingPathname(registrationFormUrl);
}
