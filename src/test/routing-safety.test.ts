import { describe, expect, it } from "vitest";
import { generatePath, matchRoutes, resolvePath } from "react-router-dom";

const publicRoutes = [
  { path: "/" },
  { path: "/assets" },
  { path: "/asset/:slug" },
  { path: "/creators" },
  { path: "/creator/:slug" },
  { path: "/collections" },
  { path: "/collections/:slug" },
  { path: "/blog" },
  { path: "/blog/:slug" },
];

describe("public route matching safety", () => {
  it("keeps normal internal navigation targets inside the app", () => {
    expect(matchRoutes(publicRoutes, "/assets")?.at(-1)?.route.path).toBe("/assets");
    expect(matchRoutes(publicRoutes, "/collections")?.at(-1)?.route.path).toBe("/collections");
    expect(resolvePath("/assets", "/").pathname).toBe("/assets");
  });

  it("resolves asset and creator detail routes without treating slugs as external redirects", () => {
    expect(generatePath("/asset/:slug", { slug: "prompt-pack" })).toBe("/asset/prompt-pack");
    expect(generatePath("/creator/:slug", { slug: "make-better" })).toBe("/creator/make-better");
    expect(matchRoutes(publicRoutes, "/asset/prompt-pack")?.at(-1)?.route.path).toBe("/asset/:slug");
    expect(matchRoutes(publicRoutes, "/creator/make-better")?.at(-1)?.route.path).toBe("/creator/:slug");
  });

  it("does not match protocol-relative or absolute redirect-like targets as app routes", () => {
    expect(matchRoutes(publicRoutes, "//evil.example/asset/prompt-pack")).toBeNull();
    expect(matchRoutes(publicRoutes, "https://evil.example/asset/prompt-pack")).toBeNull();
    expect(matchRoutes(publicRoutes, "/asset/https://evil.example")).toBeNull();
  });
});
