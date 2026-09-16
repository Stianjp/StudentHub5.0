export function shouldUseDirectImageUrl(src: null | string | undefined) {
  if (!src) return false;

  return (
    src.includes("/storage/v1/object/sign/") ||
    src.includes("/storage/v1/object/authenticated/") ||
    src.includes("/storage/v1/render/image/sign/") ||
    src.includes("/storage/v1/render/image/authenticated/")
  );
}
