const {
  sanitizeCourseRichText,
  sanitizePlainText,
  sanitizeProfileText,
} = require("../utils/sanitizers");

describe("EduLearn sanitization", () => {
  test("course rich text strips scripts", () => {
    const out = sanitizeCourseRichText(
      '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><b>ok</b>',
    );
    expect(out).toContain("<p>Hello</p>");
    expect(out).toContain("<b>ok</b>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("javascript:");
  });

  test("profile text is text-only", () => {
    const out = sanitizeProfileText("<img src=x onerror=alert(1)>hi");
    expect(out).toContain("hi");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror");
  });

  test("plain text escapes HTML", () => {
    const out = sanitizePlainText("<b>x</b>");
    expect(out).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
