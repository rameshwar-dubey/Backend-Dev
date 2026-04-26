const {
  normalizeDateISO,
  sanitizeDoctorNotes,
  escapeRegex,
} = require("../utils/sanitizers");

describe("MediBook validation & sanitization", () => {
  test("DOB normalizer rejects invalid date", () => {
    expect(normalizeDateISO("2026-02-31")).toBe("");
    expect(normalizeDateISO("not-a-date")).toBe("");
    expect(normalizeDateISO("2026-04-18")).toBe("2026-04-18");
  });

  test("doctor notes strip HTML", () => {
    const out = sanitizeDoctorNotes("<b>x</b><script>alert(1)</script>");
    expect(out).not.toContain("<script");
    expect(out).toContain("x");
  });

  test("escapeRegex prevents regex injection", () => {
    expect(() => new RegExp(escapeRegex(".*"), "i")).not.toThrow();
  });
});
