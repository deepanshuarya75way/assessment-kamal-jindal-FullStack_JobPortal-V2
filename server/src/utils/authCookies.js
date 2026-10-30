const tokenCookieName = "jobPortalToken";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000
});

export const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return req.cookies?.[tokenCookieName];
};

export const setAuthCookie = (res, token) => {
  res.cookie(tokenCookieName, token, getCookieOptions());
};

export const clearAuthCookie = (res) => {
  const { maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(tokenCookieName, clearOptions);
};
