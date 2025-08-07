import { parseAtTokens, findActiveAtToken, replaceAtToken } from "../src/app/ui/utils/atParsing";

describe("atParsing", () => {
  test("parses single token", () => {
    const tokens = parseAtTokens("open @src/app");
    expect(tokens.length).toBe(1);
    expect(tokens[0].raw).toBe("@src/app");
    expect(tokens[0].value).toBe("src/app");
  });

  test("parses multiple tokens and ignores escaped", () => {
    const tokens = parseAtTokens("see @README.md and \@ignored and @package.json");
    expect(tokens.length).toBe(2);
    expect(tokens[0].value).toBe("README.md");
    expect(tokens[1].value).toBe("package.json");
  });

  test("finds active token by cursor", () => {
    const s = "edit @src/input and more";
    const idx = s.indexOf("in") + 1; // inside token
    const tok = findActiveAtToken(s, idx);
    expect(tok).not.toBeNull();
    expect(tok!.raw.startsWith("@src/")).toBe(true);
  });

  test("replace token", () => {
    const s = "open @src/ap";
    const tok = findActiveAtToken(s, s.indexOf("@") + 3)!;
    const replaced = replaceAtToken(s, tok, "@src/app/");
    expect(replaced).toBe("open @src/app/");
  });
});
