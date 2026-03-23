import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/resend";

describe("renderTemplate", () => {
  it("erstatter enkelt variabel", () => {
    const result = renderTemplate("<p>Hei {{name}}</p>", { name: "Stian" });
    expect(result).toBe("<p>Hei Stian</p>");
  });

  it("erstatter flere variabler", () => {
    const result = renderTemplate("Hei {{firstName}} {{lastName}}", {
      firstName: "Ola",
      lastName: "Nordmann",
    });
    expect(result).toBe("Hei Ola Nordmann");
  });

  it("erstatter samme variabel flere ganger", () => {
    const result = renderTemplate("{{event}} - Velkommen til {{event}}", {
      event: "Student Connect 2026",
    });
    expect(result).toBe("Student Connect 2026 - Velkommen til Student Connect 2026");
  });

  it("beholder ukjente variabler uendret", () => {
    const result = renderTemplate("Hei {{ukjent}}", {});
    expect(result).toBe("Hei {{ukjent}}");
  });

  it("returnerer teksten uendret når ingen variabler finnes", () => {
    const html = "<p>Ingen variabler her.</p>";
    expect(renderTemplate(html, {})).toBe(html);
  });

  it("håndterer tom streng", () => {
    expect(renderTemplate("", { name: "test" })).toBe("");
  });

  it("erstatter variabel i subject og html", () => {
    const subject = renderTemplate("Velkom til {{eventName}}", { eventName: "SC2026" });
    const html = renderTemplate("<p>Vi gleder oss til {{eventName}}!</p>", {
      eventName: "SC2026",
    });
    expect(subject).toBe("Velkom til SC2026");
    expect(html).toBe("<p>Vi gleder oss til SC2026!</p>");
  });
});
