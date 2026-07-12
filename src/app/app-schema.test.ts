import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the product schema for Forge", () => {
    expect(appSchema.canvas.draggable).toBe(true);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(true);
    
    // Check that we have our custom panels enabled
    expect(appSchema.panels.layers).toBeDefined();
    expect(appSchema.panels.timeline).toBeUndefined();
    
    // Check toolbar
    expect(appSchema.toolbar).toEqual({
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    });
  });

  it("includes product-specific control sections", () => {
    const productSections =
      appSchema.panels.controls?.sections.filter((section) => section.title !== "Setup") ??
      [];

    expect(productSections.length).toBeGreaterThan(0);
  });

  it("includes performance workload targets", () => {
    expect(appPerformance.workloadTargets.length).toBeGreaterThan(0);
    expect(appPerformance.workloadTargets).toContain("export.image.resolution");
  });
});

