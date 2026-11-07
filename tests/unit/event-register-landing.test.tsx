import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/event-registration", () => ({
  listPublicRegistrationCampaigns: vi.fn().mockResolvedValue([]),
}));

import EventRegisterLandingPage from "@/app/event-register/page";

it("shows the contact address when no registrations are open", async () => {
  const markup = renderToStaticMarkup(await EventRegisterLandingPage());
  expect(markup).toContain("No events? Contact us on");
  expect(markup).toContain('href="mailto:event@oslostudenthub.no"');
  expect(markup).toContain("Get contacted when registration opens");
});
