import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.STUDENT_PORTAL_E2E !== "1", "Run with tests/student.playwright.config.ts and its isolated fixture API.");

const fixtureApi = "http://127.0.0.1:4050";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function signIn(page: Page, next = "") {
  await page.goto(`/auth/sign-in?role=student${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email", { exact: true }).fill("student@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Test-password-123!");
  await page.locator("button[type=submit]").filter({ hasText: "Sign in" }).click();
  await expect(page).toHaveURL(/\/student\/events$/);
}

test.beforeEach(async ({ request, page }) => {
  await request.post(`${fixtureApi}/test/reset`);
  // Never order tickets during tests. Most tests stub only this external script.
  await page.route("https://registration.checkin.no/registration.loader.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: 'document.getElementById("checkin_registration").innerHTML = "<p>Ticket form test placeholder</p>";',
  }));
});

for (const width of [320, 390, 430, 1280]) {
  test(`dashboard has exactly three ordered cards and readable navigation at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    await page.locator("main").getByRole("link", { name: "Dashboard", exact: true }).click();
    const sections = page.locator("main section");
    await expect(sections).toHaveCount(3);
    await expect(sections.locator("h2")).toHaveText(["Get your free ticket", "Your profile", "Participating companies"]);
    await expect(page.getByRole("progressbar", { name: "Profile completion" })).toHaveAttribute("value", "50");
    await expect(page.getByText("5 participating companies · 2 favourites selected")).toBeVisible();
    await expect(sections.nth(2).locator("li")).toHaveCount(4);
    await expect(page.getByText("Alpha duplicate")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const nav = page.getByRole("navigation", { name: width < 1024 ? "Mobile navigation" : "Main navigation", exact: true });
    await expect(nav.getByRole("link")).toHaveText(["Ticket", "Dashboard", "My profile", "Consents"]);
    for (const button of await sections.getByRole("link").all()) {
      const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}.png`), fullPage: true });
    const companiesButton = page.getByRole("link", { name: "Explore companies & choose favourites" });
    await companiesButton.focus();
    expect(await companiesButton.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    if (width < 1024) {
      const actionBox = await companiesButton.boundingBox();
      const navBox = await nav.boundingBox();
      expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(navBox!.y);
    }
  });
}

test("legacy dashboard sign-in and Google OAuth both land on Ticket", async ({ page, context }) => {
  await signIn(page, "/student/dashboard");
  await context.clearCookies();
  await page.goto("/auth/sign-in?role=student&next=%2Fstudent%2Fdashboard");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page).toHaveURL(/\/student\/events$/);
  await expect(page.getByRole("heading", { name: "Get your free ticket" })).toBeVisible();
});

test("participating company filters and favourite saves preserve hidden companies", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/student/companies?q=Alpha");
  await expect(page.getByText("Showing 1 of 5 companies.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Other event/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Alpha/ }).click();
  await page.getByRole("button", { name: "Save favourites" }).click();
  await expect(page.getByText("Favourites updated.")).toBeVisible();
  let state = await (await request.get(`${fixtureApi}/test/state`)).json();
  expect(state.students[0].liked_company_ids).toEqual([id(11), id(15), id(10)]);
  await page.goto("/student/companies?industry=Elektro");
  await expect(page.getByText("Showing 1 of 5 companies.")).toBeVisible();
  await page.getByRole("button", { name: /Beta/ }).click();
  await page.getByRole("button", { name: "Save favourites" }).click();
  await expect(page.getByText("Favourites updated.")).toBeVisible();
  state = await (await request.get(`${fixtureApi}/test/state`)).json();
  expect(state.students[0].liked_company_ids).toEqual([id(15), id(10)]);
  expect(state.consents.find((consent: { company_id: string }) => consent.company_id === id(11)).consent).toBe(false);
  expect(state.consents.find((consent: { company_id: string }) => consent.company_id === id(15)).consent).toBe(true);
  await page.goto("/student/companies?q=no-company-matches");
  await expect(page.getByText("No companies match your search or filters.")).toBeVisible();
});

test("profile saves update dashboard completion to 100 percent", async ({ page }) => {
  await signIn(page);
  await page.goto("/student");
  await page.getByLabel("Phone", { exact: true }).fill("12345678");
  await page.getByLabel("About me", { exact: true }).fill("I am a student interested in technology.");
  await page.getByLabel("Preferred work style", { exact: true }).fill("Hybrid");
  await page.getByLabel("Social profile (LinkedIn/GitHub/portfolio)", { exact: true }).fill("https://example.com/ada");
  await page.getByRole("combobox", { name: "Preferred team size", exact: true }).selectOption("1-5");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile updated.")).toBeVisible();
  await page.goto("/student/dashboard");
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "100");
  await expect(page.getByText("Profile complete", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit profile" })).toBeVisible();
});

test("profile, companies and consents reflow on small mobile screens", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await signIn(page);
  for (const path of ["/student", "/student/companies", "/student/consents"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const card = page.locator("main .osh-card").first();
    await expect(card).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll("/", "-")}-320.png`), fullPage: true });
  }
});

test("real Checkin loader mounts on mobile without submitting a ticket", async ({ page }, testInfo) => {
  await page.unroute("https://registration.checkin.no/registration.loader.js");
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await expect.poll(() => page.locator("#checkin_registration").evaluate((element) => element.childElementCount), { timeout: 45_000 }).toBeGreaterThan(0);
  await expect(page.locator("script[data-event-id='228140']")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("ticket-390.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const role of ["admin", "company"] as const) {
  test(`${role} portal uses the shared light theme on mobile and desktop`, async ({ page }, testInfo) => {
    const host = role === "admin" ? "admin" : "bedrift";
    const base = `http://${host}.localhost:3012`;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/auth/sign-in`);
    await page.getByLabel("Email", { exact: true }).fill(role === "admin" ? "admin@oslostudenthub.no" : "company@example.test");
    await page.getByLabel("Password", { exact: true }).fill("Test-password-123!");
    await page.locator("button[type=submit]").filter({ hasText: "Sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/${role}$`));
    await expect(page.locator(".portal-light-scope .osh-card").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("#portal-main")).toHaveCSS("background-color", "rgb(237, 232, 245)");
    await page.screenshot({ path: testInfo.outputPath(`${role}-dashboard-mobile.png`), fullPage: true });
    await page.getByRole("button", { name: "Åpne meny" }).click();
    await expect(page.locator("#portal-mobile-menu")).toBeVisible();
    await page.getByRole("button", { name: "Lukk meny" }).first().click();
    const destination = role === "admin" ? "/admin/students" : "/company/representation";
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}${destination}`);
      await expect(page.locator(".portal-light-scope .osh-card").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
      const field = page.locator(".portal-light-scope").locator("input:not([type=hidden]), textarea").first();
      await expect(field).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(field).toHaveCSS("color", "rgb(20, 2, 73)");
      await field.focus();
      expect(await field.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (role === "admin") await expect(page.locator("table").first()).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await page.screenshot({ path: testInfo.outputPath(`${role}-${width}.png`), fullPage: true });
    }
  });
}

test("admin lead overview ranks unique active leads and filters categories", async ({ page, request }, testInfo) => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  await request.post("http://127.0.0.1:4050/rest/v1/consents", { data: [
    { company_id: id(10), student_id: id(2), consent: true },
    { company_id: id(10), student_id: id(2), consent: true },
    { company_id: id(10), student_id: id(6), consent: true },
    { company_id: id(11), student_id: id(2), consent: true },
    { company_id: id(12), student_id: id(2), consent: false },
  ] });
  await page.goto("http://admin.localhost:3012/auth/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("admin@oslostudenthub.no");
  await page.getByLabel("Password", { exact: true }).fill("Test-password-123!");
  await page.locator("button[type=submit]").filter({ hasText: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("http://admin.localhost:3012/admin/leads/overview");
  await expect(page.getByRole("heading", { name: "Oversikt", exact: true })).toBeVisible();
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(6);
  await expect(rows.nth(0)).toContainText("Alpha");
  await expect(rows.nth(0).locator("td")).toHaveText("2");
  await expect(rows.nth(1)).toContainText("Beta");
  await expect(rows.nth(1).locator("td")).toHaveText("1");
  await expect(rows.nth(2).locator("td")).toHaveText("0");
  await page.getByLabel("Kategori", { exact: true }).selectOption("Data/IT");
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  await expect(rows).toHaveCount(5);
  await expect(rows.first()).toContainText("Alpha");
  await expect(page.getByRole("link", { name: "Beta", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Kategori", { exact: true })).toHaveValue("Data/IT");
  for (const width of [320, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`lead-overview-${width}.png`), fullPage: true });
  }
  await page.getByLabel("Kategori", { exact: true }).selectOption("Elektro");
  await page.getByRole("button", { name: "Filtrer", exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Beta");
  await page.getByRole("link", { name: "Nullstill", exact: true }).click();
  await expect(rows).toHaveCount(6);
  await page.goto("http://admin.localhost:3012/admin/leads/overview?category=Unknown");
  await expect(page.getByText("Ingen bedrifter å vise i denne kategorien.")).toBeVisible();
});

test("admin can create and publish a feedback form on the public landing", async ({ page, browser }, testInfo) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("http://admin.localhost:3012/auth/sign-in");
  await page.getByLabel("Email", { exact: true }).fill("admin@oslostudenthub.no");
  await page.getByLabel("Password", { exact: true }).fill("Test-password-123!");
  await page.locator("button[type=submit]").filter({ hasText: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("http://admin.localhost:3012/admin/forms/new");
  await page.getByLabel("Skjematittel", { exact: true }).fill("Test feedback");
  await page.getByLabel("Spørsmålstekst", { exact: true }).fill("Hva synes du?");
  await page.getByRole("checkbox", { name: "Publiser skjemaet med en gang" }).check();
  await page.getByRole("checkbox", { name: "Obligatorisk å svare" }).check();
  await page.getByRole("button", { name: "Opprett skjema", exact: true }).click();
  await testInfo.attach("console-errors", { body: errors.join("\n"), contentType: "text/plain" });
  await expect(page).toHaveURL(/\/admin\/forms\/[a-f0-9-]+\?saved=1$/);
  // Compile the public detail route before opening a second dev-server context.
  await page.request.get("http://feedback.localhost:3012/feedback/student-connect-2026/test-feedback");
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto("http://feedback.localhost:3012/#skjemaer");
  await expect(publicPage.locator("#skjemaer").getByRole("link", { name: /Test feedback/ })).toBeVisible();
  await publicPage.locator("#skjemaer").getByRole("link", { name: /Test feedback/ }).click();
  await expect(publicPage.getByRole("textbox", { name: /Hva synes du/ })).toBeVisible();
  await expect(publicPage.getByRole("textbox", { name: /Hva synes du/ })).toHaveAttribute("required", "");
  expect(errors.filter((message) => message.includes("hydrated"))).toEqual([]);
  await page.getByText("Rediger spørsmål", { exact: true }).click();
  const editQuestionForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Lagre spørsmål", exact: true }) });
  await editQuestionForm.getByLabel("Spørsmålstekst", { exact: true }).fill("Hva synes du etter oppdatering?");
  await editQuestionForm.getByRole("button", { name: "Lagre spørsmål", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/forms\/[a-f0-9-]+\?saved=1$/);
  await publicPage.reload();
  await expect(publicPage.getByRole("textbox", { name: /Hva synes du etter oppdatering/ })).toBeVisible();
  await page.goto("http://admin.localhost:3012/admin/forms");
  await expect(page.getByRole("link", { name: "Åpen side", exact: true })).toHaveAttribute("href", "https://feedback.oslostudenthub.no/student-connect-2026/test-feedback");
  await page.getByRole("button", { name: "Avpubliser", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publiser", exact: true })).toBeVisible();
  await publicPage.goto("http://feedback.localhost:3012/#skjemaer");
  await expect(publicPage.getByText("Ingen publiserte skjemaer er tilgjengelige akkurat nå.")).toBeVisible();
  await page.getByRole("button", { name: "Publiser", exact: true }).click();
  await expect(page.getByRole("button", { name: "Avpubliser", exact: true })).toBeVisible();
  await publicPage.reload();
  await expect(publicPage.locator("#skjemaer").getByRole("link", { name: /Test feedback/ })).toBeVisible();
  await visitor.close();
});
