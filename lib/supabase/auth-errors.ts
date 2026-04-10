type AuthLikeError = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
};

function normalizeMessage(error: AuthLikeError | null | undefined) {
  return error?.message?.toLowerCase() ?? "";
}

export function isRefreshTokenError(error: AuthLikeError | null | undefined) {
  const code = error?.code ?? "";
  const message = normalizeMessage(error);

  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "invalid_refresh_token" ||
    message.includes("refresh token not found") ||
    message.includes("refresh_token_not_found") ||
    message.includes("refresh token") ||
    message.includes("invalid refresh token") ||
    message.includes("already used")
  );
}

export function isRecoverableRefreshTokenError(error: AuthLikeError | null | undefined) {
  const code = error?.code ?? "";
  const message = normalizeMessage(error);

  return (
    code === "refresh_token_not_found" ||
    code === "refresh_token_already_used" ||
    code === "invalid_refresh_token" ||
    message.includes("refresh token not found") ||
    message.includes("invalid refresh token") ||
    message.includes("already used")
  );
}
