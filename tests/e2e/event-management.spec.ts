import { expect, test } from "@playwright/test";
test.skip(
  process.env.EVENT_MANAGEMENT_E2E !== "1",
  "Use the isolated event-management fixture server.",
);
const fixture = "http://127.0.0.1:4051";
test.beforeEach(async ({ request, page }) => {
  await request.post(`${fixture}/test/reset`);
  await page.route("https://registration.checkin.no/registration.loader.js", route=>route.fulfill({contentType:"application/javascript",body:""}));
});
test("company orders by audience and quantity without a stand selector", async ({
  page,
}) => {
  await page.goto("/event-register/test-event");
  await page.getByLabel("First name").fill("Ola");
  await page.getByLabel("Last name").fill("Nordmann");
  await page.getByLabel("E-mail", { exact: true }).fill("ola@example.test");
  await page.getByLabel("Phone number").fill("12345678");
  await page.getByRole("button", { name: "Next", exact: true }).press("Enter");
  await page.getByLabel("Company name").fill("Test AS");
  await page.getByLabel("MVA-ID").fill("123456789");
  await page.getByLabel("Country / Region").fill("Norway");
  await page.getByLabel("Address", { exact: true }).fill("Testveien 1");
  await page.getByLabel("City").fill("Oslo");
  await page.getByLabel("Zip / Postal code").fill("0154");
  await page.getByRole("button", { name: "Next", exact: true }).press("Enter");
  await page.getByLabel("Invoice e-mail").fill("invoice@example.test");
  await page.getByRole("button", { name: "Next", exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Which students would you like to meet?",
    }),
  ).toBeVisible();
  await page.getByLabel("IT / Computer engineer").check();
  await page.getByLabel("Electrical engineer", { exact: true }).check();
  await page.getByRole("button", { name: "Next", exact: true }).press("Enter");
  await page.getByRole("button", { name: /^Standard/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Included items and optional extras" }),
  ).toBeVisible();
  await expect(page.getByTestId("stand-map-canvas")).toHaveCount(0);
  await page.getByLabel("Extra Tables", { exact: true }).fill("3");
  await expect(page.getByText(/Total:.*20\s?300/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Extra Tables", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/event-addons-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next", exact: true }).press("Enter");
  await expect(page.getByText("Student audience", {exact:true}).last()).toBeVisible();
  let submitted="";
  await page.route("**/api/event-register/campaigns/test-event/applications", async route=>{submitted=route.request().postData()??""; await route.fulfill({json:{ok:true,id:"submitted-test"}});});
  await page.getByRole("button",{name:"Send application",exact:true}).press("Enter");
  await expect(page.getByText(/submitted/i).first()).toBeVisible();
  expect(submitted).toContain("addonQuantities"); expect(submitted).not.toContain("requestedStandId");
});
test("an unpublished event is unavailable at its direct registration URL", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/test/close`);
  const response = await page.goto("/event-register/test-event");
  expect(response?.status()).toBe(404);
});

test("admin catalog validates prices and confirms placement independently of its suggestion",async({page})=>{
 await page.goto("/auth/sign-in?role=admin&next=%2Fadmin%2Fevent-catalog");
 await page.getByLabel("Email",{exact:true}).fill("admin@oslostudenthub.no"); await page.getByLabel("Password",{exact:true}).fill("Test-password-123!"); await page.getByRole("button",{name:"Sign in",exact:true}).last().press("Enter");
 await expect(page).toHaveURL(/\/admin\/event-catalog/);
 await page.goto("/admin/event-catalog"); await expect(page.getByRole("heading",{name:"Pakker og tillegg",exact:true})).toBeVisible();
 const form=page.locator('form').filter({has:page.locator('input[name="id"][value="00000000-0000-4000-8000-000000000062"]')});
 await form.getByLabel("Aktivt tillegg").check(); await form.getByRole("button",{name:"Lagre tillegg"}).press("Enter"); await expect(page.getByRole("alert").filter({hasText:"Sett pris"})).toBeVisible();
 await page.goto("/admin/events/00000000-0000-4000-8000-000000000020/placement"); await expect(page.getByRole("heading",{name:"Områder og plassering"})).toBeVisible();
 await page.getByLabel("Endelig område").fill("Flere fagområder"); await page.getByRole("button",{name:"Bekreft område"}).press("Enter");
 await expect(page.getByText("Bekreftet område: Flere fagområder",{exact:false})).toBeVisible();
 await page.setViewportSize({width:390,height:844}); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"test-results/event-placement-mobile.png",fullPage:true});
});

test("student sees only approved exhibitors and can filter their audience",async({page})=>{
 page.setDefaultTimeout(15000);

 await page.goto("/auth/sign-in?role=student&next=%2Fstudent%2Fevents"); await page.getByLabel("Email",{exact:true}).fill("student@example.test"); await page.getByLabel("Password",{exact:true}).fill("Test-password-123!"); await page.getByRole("button",{name:"Sign in",exact:true}).last().press("Enter");
 await expect(page).toHaveURL(/\/student\/events/);
 await page.goto("/student/events/00000000-0000-4000-8000-000000000020",{waitUntil:"domcontentloaded"}); await expect(page.getByRole("heading",{name:"Alpha",exact:true})).toBeVisible();
 await page.getByRole("combobox",{name:"Studieretning",exact:true}).selectOption("Law"); await page.getByRole("button",{name:"Vis bedrifter"}).press("Enter"); await expect(page.getByText("Ingen godkjente bedrifter",{exact:false})).toBeVisible();
 await expect(page.getByText("invoice@example.test")).toHaveCount(0);
});
