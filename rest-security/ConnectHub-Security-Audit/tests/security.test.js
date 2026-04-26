describe("ConnectHub security sanitization", () => {
  test("post sanitization strips scripts but allows basic tags", async () => {
    const { sanitizeLimitedPostHtml } = require("../utils/sanitizers");
    const out = sanitizeLimitedPostHtml(
      '<b>hi</b><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
    );

    expect(out).toContain("<b>hi</b>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("javascript:");
  });

  test("bio is text-only and escaped", async () => {
    const { sanitizeBio } = require("../utils/sanitizers");
    const out = sanitizeBio("<img src=x onerror=alert(1)>hello");

    expect(out).toContain("hello");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("<img");
  });

  test("profile URL sanitizer rejects unsafe URLs", async () => {
    const { sanitizeProfileUrl } = require("../utils/sanitizers");

    expect(sanitizeProfileUrl("http://example.com")).toBe("");
    expect(sanitizeProfileUrl("https://localhost/a.png")).toBe("");
    expect(sanitizeProfileUrl("https://127.0.0.1/a.png")).toBe("");
    expect(sanitizeProfileUrl("https://example.com/a.png")).toBe(
      "https://example.com/a.png",
    );
  });
});
