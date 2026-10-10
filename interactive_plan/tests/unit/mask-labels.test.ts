// The bind probe prints masked labels, never real addresses (adr-0027; tests/e2e/mask-labels.ts).
import { describe, expect, it } from "vitest";
import { addressLabeler, parseMaskMap } from "../e2e/mask-labels";

const MAP = `# comment
LAN_IPV4_1=192.0.2.10
LINK_LOCAL_IPV6_1=fe80::1
LAN_IPV6_NET_PREFIX=2001:db8:1:2:
bad line
lower=1.2.3.4
`;

describe("parseMaskMap", () => {
  it("reads MASK=real lines and skips comments, blanks and malformed lines", () => {
    expect(parseMaskMap(MAP)).toEqual([
      { key: "LAN_IPV4_1", value: "192.0.2.10" },
      { key: "LINK_LOCAL_IPV6_1", value: "fe80::1" },
      { key: "LAN_IPV6_NET_PREFIX", value: "2001:db8:1:2:" },
    ]);
  });
});

describe("addressLabeler", () => {
  it("uses the map name, keeps a link-local scope, applies prefixes", () => {
    const label = addressLabeler(parseMaskMap(MAP));
    expect(label("192.0.2.10")).toBe("<LAN_IPV4_1>");
    expect(label("FE80::1%12")).toBe("<LINK_LOCAL_IPV6_1>%12");
    expect(label("2001:db8:1:2:abcd::5")).toBe("<LAN_IPV6_NET>");
  });
  it("gives unknown addresses stable numbered stand-ins and never returns the real value", () => {
    const label = addressLabeler([]);
    expect(label("198.51.100.7")).toBe("<IPV4_1>");
    expect(label("198.51.100.8")).toBe("<IPV4_2>");
    expect(label("198.51.100.7")).toBe("<IPV4_1>");
    expect(label("2001:db8::9")).toBe("<IPV6_1>");
    expect(label("fe80::2%7")).toBe("<LINK_LOCAL_IPV6_1>%7");
  });
});
