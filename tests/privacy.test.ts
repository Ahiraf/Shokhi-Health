import { describe, expect, it } from "vitest";
import { deleteShokhiStorageKeys } from "../lib/profile";

function fakeStore(initial: Record<string, string>) {
  const store: Record<string, unknown> & { removeItem: (key: string) => void; keys: () => string[] } = {
    ...initial,
    removeItem(key: string) { delete store[key]; },
    keys() { return Object.keys(store).filter((key) => key !== "removeItem" && key !== "keys"); },
  };
  return store;
}

describe("device privacy controls", () => {
  it("deletes Shokhi data without touching unrelated browser data", () => {
    const local = fakeStore({ shokhi_profile: "profile", shokhi_cycle_logs: "[]", other_site: "keep" });
    const session = fakeStore({ shokhi_notif_seen: "x", other_session: "keep" });
    expect(deleteShokhiStorageKeys(local)).toBe(2);
    expect(deleteShokhiStorageKeys(session)).toBe(1);
    expect(local.keys()).toEqual(["other_site"]);
    expect(session.keys()).toEqual(["other_session"]);
  });
});
