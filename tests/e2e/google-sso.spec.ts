import { expect, test } from "@playwright/test";

function portalUrl(subdomain: "student" | "bedrift" | "admin" | "www", pathname: string) {
  const url = new URL(pathname, process.env.E2E_BASE_URL ?? "http://localhost:3000");
  url.hostname = `${subdomain}.${url.hostname}`;
  return url.toString();
}

test("student sign-in offers Google without removing email sign-in", async ({ page }) => {
  await page.goto(portalUrl("student", "/auth/sign-in"));
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("company sign-in offers Google", async ({ page }) => {
  await page.goto(portalUrl("bedrift", "/auth/sign-in"));
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("admin sign-in does not offer Google", async ({ page }) => {
  await page.goto(portalUrl("admin", "/auth/sign-in"));
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
});

test("the public site does not start a portal-specific Google flow", async ({ page }) => {
  await page.goto(portalUrl("www", "/auth/sign-in?role=student"));
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
});

test("OAuth onboarding requires an authenticated session", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto(portalUrl("student", "/auth/onboarding/student"));
  await expect(page).toHaveURL(/\/auth\/sign-in\?role=student/);
});

test("cancelled Google consent returns a safe retry link", async ({ page }) => {
  await page.goto("/auth/callback?role=student&error=access_denied");
  await expect(page.getByText("Google sign-in was cancelled")).toBeVisible();
  await expect(page.getByRole("link", { name: /go to sign-in/i })).toHaveAttribute("href", "/auth/sign-in?role=student");
});

test("privacy page is public", async ({ page }) => {
  await page.goto(portalUrl("www", "/personvern"));
  await expect(page.getByRole("heading", { name: "Personvernerklæring" })).toBeVisible();
});
