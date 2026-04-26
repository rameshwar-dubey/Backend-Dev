test("XSS test", () => {
  const input = "<script>alert(1)</script>";
  const output = xss(input);

  expect(output).not.toContain("<script>");
});