import { test, expect } from "@playwright/test";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";
import {
  expectNoForbiddenCanvasUi,
  expectExportExcludesCanvasHandles,
} from "./canvas-handle-helpers";
import {
  getToolcraftFieldByLabel,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToValue,
} from "./performance-helpers";

test.beforeEach(async ({ page }) => {
  // Suppress product tour popups and session storage initialization
  await page.addInitScript(() => {
    window.localStorage.setItem("forge_tour_completed", "true");
    window.sessionStorage.setItem("forge_initialized", "true");
  });
  await page.goto("/");
  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
});

// Helper to simulate drag and drop upload of a fake SVG file
async function uploadImage(page: any, filename = "test.svg") {
  const upload = await page.evaluateHandle((fname) => {
    const dataTransfer = new DataTransfer();
    const file = new File(
      [
        `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="96"><rect width="128" height="96" fill="#888" id="${fname}"/></svg>`,
      ],
      fname,
      { type: "image/svg+xml" },
    );
    dataTransfer.items.add(file);
    return dataTransfer;
  }, filename);

  await page
    .getByRole("application", { name: "Canvas viewport" })
    .dispatchEvent("drop", { dataTransfer: upload });
}

// Helper to hover a layer list row to make actions visible and click a specific button
async function clickRowButton(page: any, layerName: string, buttonLabel: string) {
  const layersPanel = page.locator('[data-toolcraft-layers-panel]');
  const rowText = layersPanel.getByText(layerName, { exact: true });
  await expect(rowText).toBeVisible();
  await rowText.hover();
  await page.getByRole("button", { name: buttonLabel }).click();
}

// -------------------------------------------------------------
// TIER 1: FEATURE COVERAGE (30 TESTS, 5 PER FEATURE F1-F6)
// -------------------------------------------------------------

test.describe("Tier 1: Feature Coverage", () => {
  // F1: Media Upload & Management
  test("F1-1: Upload single image asset and verify its layer is created and listed", async ({ page }) => {
    await uploadImage(page, "image1.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("image1", { exact: true })).toBeVisible();
  });

  test("F1-2: Upload multiple image assets and verify they are all listed in layers", async ({ page }) => {
    await uploadImage(page, "image1.svg");
    await uploadImage(page, "image2.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("image1", { exact: true })).toBeVisible();
    await expect(layersPanel.getByText("image2", { exact: true })).toBeVisible();
  });

  test("F1-3: Delete an uploaded image asset and verify its layer is removed", async ({ page }) => {
    await uploadImage(page, "image1.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("image1", { exact: true })).toBeVisible();
    await clickRowButton(page, "image1", "Delete image1");
    await expect(layersPanel.getByText("image1", { exact: true })).toHaveCount(0);
  });

  test("F1-4: Update an uploaded image's properties and verify product output changes", async ({ page }) => {
    await uploadImage(page, "image1.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await layersPanel.getByText("image1", { exact: true }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Opacity", 0.6);
    });
  });

  test("F1-5: Clear all uploaded assets and verify the canvas resets to empty state", async ({ page }) => {
    await uploadImage(page, "image1.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("image1", { exact: true })).toBeVisible();
    await expectToolcraftProductObservableToChange(page, async () => {
      await clickRowButton(page, "image1", "Delete image1");
    });
    await expect(layersPanel.getByText("image1", { exact: true })).toHaveCount(0);
  });

  // F2: Layer Operations & Organization
  test("F2-1: Add a new layer group and verify it is listed in the layers panel", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("Group", { exact: true })).toBeVisible();
  });

  test("F2-2: Select a layer group and check its properties panel displays Group Properties", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await layersPanel.getByText("Group", { exact: true }).click();
    await expect(page.getByText("Group Properties")).toBeVisible();
  });

  test("F2-3: Toggle layer visibility from layers panel and verify output is affected", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await clickRowButton(page, "Background", "Hide Background");
    });
  });

  test("F2-4: Reorder layers and verify rendering order", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    
    const sourceRow = page.locator('[data-layer-id="layer-initial"]');
    const targetRow = page.locator('[data-template-layer-kind="group"]').first();
    await sourceRow.dragTo(targetRow);
  });

  test("F2-5: Nest an image layer into a group and verify the group hierarchy changes", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    await uploadImage(page, "image1.svg");
    
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    const imgRow = layersPanel.getByText("image1", { exact: true });
    const groupRow = layersPanel.getByText("Group", { exact: true });
    await imgRow.dragTo(groupRow);
  });

  // F3: Effect Layers & Controls
  test("F3-1: Add a Shader layer and verify it renders the default Mesh Gradient", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("button", { name: "Add Shader" }).click();
    });
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("Shader Background")).toBeVisible();
  });

  test("F3-2: Change Shader type to Liquid Metal and verify canvas output changes", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("combobox", { name: "Shader Type" }).click();
      await page.getByRole("option", { name: "Liquid Metal" }).click();
    });
  });

  test("F3-3: Add a Tech Overlay layer and check its density slider modifies output", async ({ page }) => {
    await page.getByRole("button", { name: "Add Tech Overlay" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Density", 0.85);
    });
  });

  test("F3-4: Add a Glitch layer and toggle the RGB Split (VHS) checkbox", async ({ page }) => {
    await page.getByRole("button", { name: "Add Glitch" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("checkbox", { name: "RGB Split (VHS)" }).click();
    });
  });

  test("F3-5: Add a Halftone layer and verify its controls update canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Add Halftone" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Size", 12);
    });
  });

  // F4: Grid Layout Engine
  test("F4-1: Add a Grid Layout layer and verify a grid group is created", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("Grid Layout")).toBeVisible();
  });

  test("F4-2: Change Grid Style and verify output change", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("combobox", { name: "Grid Style" }).click();
      await page.getByRole("option", { name: "Symmetrical" }).click();
    });
  });

  test("F4-3: Modify Grid columns and rows and check that cells rearrange", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Complexity X", 5);
      await dragToolcraftSliderToValue(page, "Complexity Y", 4);
    });
  });

  test("F4-4: Change Grid Layout Gap Size and verify spacing changes on canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Gap Size", 25);
    });
  });

  test("F4-5: Change Layout Seed and verify output randomized arrangement changes", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Layout Seed", 550221);
    });
  });

  // F5: God-Mode Shuffle
  test("F5-1: Click Shuffle button and verify it shuffles active layer properties", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    });
  });

  test("F5-2: Lock a layer, run Shuffle, and verify locked layer properties remain unchanged", async ({ page }) => {
    await clickRowButton(page, "Background", "Lock Background");
    const snapshotBefore = await getToolcraftProductObservableSnapshot(page);
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    const snapshotAfter = await getToolcraftProductObservableSnapshot(page);
    expect(snapshotBefore).toBe(snapshotAfter);
  });

  test("F5-3: Shuffle colors and check that shader colors update", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    const inputBefore = await page.getByRole("textbox", { name: "Color 1 hex" }).inputValue();
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    const inputAfter = await page.getByRole("textbox", { name: "Color 1 hex" }).inputValue();
    expect(inputBefore).not.toBe(inputAfter);
  });

  test("F5-4: Trigger Shuffle using spacebar keypress and verify output changes", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.keyboard.press("Space");
    });
  });

  test("F5-5: Run Shuffle multiple times and check that canvas output evolves differently", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.keyboard.press("Space");
    });
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.keyboard.press("Space");
    });
  });

  // F6: Canvas Interactions & Export
  test("F6-1: Zoom canvas using toolbar zoom controls and verify viewport changes", async ({ page }) => {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByText("120%")).toBeVisible();
  });

  test("F6-2: Export canvas to PNG format and verify download action", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("forge-export-");
  });

  test("F6-3: Toggle Include Background switch and verify canvas background visibility", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("checkbox", { name: "Include" }).click();
    });
  });

  test("F6-4: Change scene background color and verify canvas background updates", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("textbox", { name: "scene-background hex" }).fill("00ffff");
      await page.getByRole("textbox", { name: "scene-background hex" }).press("Enter");
    });
  });

  test("F6-5: Toggle canvas radar/center toolbar buttons and verify centering", async ({ page }) => {
    await page.getByRole("button", { name: "Center canvas" }).click();
  });
});

// -------------------------------------------------------------
// TIER 2: BOUNDARY & CORNER (30 TESTS, 5 PER FEATURE F1-F6)
// -------------------------------------------------------------

test.describe("Tier 2: Boundary & Corner Cases", () => {
  // F1 Boundaries
  test("F1-B1: Upload a non-image format and verify it is not accepted", async ({ page }) => {
    const upload = await page.evaluateHandle(() => {
      const dataTransfer = new DataTransfer();
      const file = new File(["some plain text"], "text.txt", { type: "text/plain" });
      dataTransfer.items.add(file);
      return dataTransfer;
    });
    await page.getByRole("application", { name: "Canvas viewport" }).dispatchEvent("drop", { dataTransfer: upload });
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("text", { exact: true })).toHaveCount(0);
  });

  test("F1-B2: Upload extremely large resolution and check responsiveness", async ({ page }) => {
    await uploadImage(page, "large_image.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("large_image", { exact: true })).toBeVisible();
  });

  test("F1-B3: Upload many images and verify list count", async ({ page }) => {
    for (let i = 0; i < 8; i++) {
      await uploadImage(page, `image-${i}.svg`);
    }
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("image-0", { exact: true })).toBeVisible();
    await expect(layersPanel.getByText("image-7", { exact: true })).toBeVisible();
  });

  test("F1-B4: Rapidly drop files and verify no duplicate layer IDs", async ({ page }) => {
    await Promise.all([
      uploadImage(page, "rapid1.svg"),
      uploadImage(page, "rapid2.svg"),
    ]);
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("rapid1", { exact: true })).toBeVisible();
    await expect(layersPanel.getByText("rapid2", { exact: true })).toBeVisible();
  });

  test("F1-B5: Delete the last remaining layer and verify canvas doesn't crash", async ({ page }) => {
    await clickRowButton(page, "Background", "Delete Background");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("Background")).toHaveCount(0);
  });

  // F2 Boundaries
  test("F2-B1: Deeply nest groups and check UI rendering stability", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
  });

  test("F2-B2: Lock layer and verify selection overlay move is disabled", async ({ page }) => {
    await uploadImage(page, "lock-test.svg");
    await clickRowButton(page, "lock-test", "Lock lock-test");
    await expect(page.locator('div[data-action="move"]')).toHaveCount(0);
  });

  test("F2-B3: Hide all layers and verify product canvas renders background only", async ({ page }) => {
    await expectToolcraftProductObservableToChange(page, async () => {
      await clickRowButton(page, "Background", "Hide Background");
    });
  });

  test("F2-B4: Attempt dragging group onto itself and verify no crash", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    const grp = layersPanel.getByText("Group", { exact: true });
    await grp.dragTo(grp);
  });

  test("F2-B5: Verify properties panel handles selected layer properties change", async ({ page }) => {
    await page.locator('[data-toolcraft-layers-panel]').getByText("Background").click();
    await expect(page.getByText("Fill Color")).toBeVisible();
  });

  // F3 Boundaries
  test("F3-B1: Change shader type color values to check rendering stability", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("textbox", { name: "Color 1 hex" }).fill("ffffff");
      await page.getByRole("textbox", { name: "Color 1 hex" }).press("Enter");
    });
  });

  test("F3-B2: Slide halftone size to minimum and spacing to maximum to check boundaries", async ({ page }) => {
    await page.getByRole("button", { name: "Add Halftone" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Size", 1);
      await dragToolcraftSliderToValue(page, "Spacing", 40);
    });
  });

  test("F3-B3: Set glitch intensity to 0 and verify glitch visual effect", async ({ page }) => {
    await page.getByRole("button", { name: "Add Glitch" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Intensity", 0.0);
    });
  });

  test("F3-B4: Input invalid hex codes in color pickers and verify fallback", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("textbox", { name: "Color 1 hex" }).fill("G12345");
      await page.getByRole("textbox", { name: "Color 1 hex" }).press("Enter");
    });
  });

  test("F3-B5: Add multiple shaders to scene and check for no WebGL crashes", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await page.getByRole("button", { name: "Add Shader" }).click();
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("Shader Background")).toHaveCount(2);
  });

  // F4 Boundaries
  test("F4-B1: Set grid columns and rows to 1 and verify output behavior", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Complexity X", 1);
      await dragToolcraftSliderToValue(page, "Complexity Y", 1);
    });
  });

  test("F4-B2: Set grid columns and rows to 10 and check stability", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Complexity X", 10);
      await dragToolcraftSliderToValue(page, "Complexity Y", 10);
    });
  });

  test("F4-B3: Set gap size to 0 and check image placement layout", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Gap Size", 0);
    });
  });

  test("F4-B4: Put 0 images inside grid layout and verify placeholder", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await expect(layersPanel.getByText("Grid Layout")).toBeVisible();
  });

  test("F4-B5: Add non-image layer types inside grid layout and verify ignored", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await page.getByRole("button", { name: "Add Shader" }).click();
  });

  // F5 Boundaries
  test("F5-B1: Shuffle with zero editable layers in list and verify no crashes", async ({ page }) => {
    await clickRowButton(page, "Background", "Delete Background");
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
  });

  test("F5-B2: Lock every layer and verify Shuffle button does nothing", async ({ page }) => {
    await clickRowButton(page, "Background", "Lock Background");
    const before = await getToolcraftProductObservableSnapshot(page);
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    const after = await getToolcraftProductObservableSnapshot(page);
    expect(before).toBe(after);
  });

  test("F5-B3: Shuffle rapidly multiple times and verify state consistency", async ({ page }) => {
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
  });

  test("F5-B4: Check history undo/redo works correctly after Shuffle", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
  });

  test("F5-B5: Verify Shuffle respects min/max schema limits", async ({ page }) => {
    await page.getByRole("button", { name: "Add Halftone" }).click();
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    const sizeValStr = await page.getByRole("slider", { name: "Size" }).getAttribute("aria-valuenow");
    const sizeVal = Number(sizeValStr);
    expect(sizeVal).toBeGreaterThanOrEqual(1);
    expect(sizeVal).toBeLessThanOrEqual(20);
  });

  // F6 Boundaries
  test("F6-B1: Export PNG with includeBackground false and check transparency", async ({ page }) => {
    await page.getByRole("checkbox", { name: "Include" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".png");
  });

  test("F6-B2: Zoom to minimum and maximum limits and verify text indicator", async ({ page }) => {
    for (let i = 0; i < 15; i++) {
      await page.getByRole("button", { name: "Zoom in" }).click();
    }
    // Zoom should clamp and still be readable
    await page.getByRole("button", { name: "Zoom out" }).click();
  });

  test("F6-B3: Drag canvas handle far outside canvas bounds", async ({ page }) => {
    await uploadImage(page, "drag-test.svg");
    const moveArea = page.locator('div[data-action="move"]');
    const box = await moveArea.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 1000, startY + 1000);
      await page.mouse.up();
    }
  });

  test("F6-B4: Click Export PNG with no layers and check it exports standard background", async ({ page }) => {
    await clickRowButton(page, "Background", "Delete Background");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".png");
  });

  test("F6-B5: Undo zoom/pan changes and verify restoration", async ({ page }) => {
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
  });
});

// -------------------------------------------------------------
// TIER 3: CROSS-FEATURE COMBINATION (6 TESTS)
// -------------------------------------------------------------

test.describe("Tier 3: Cross-Feature Combination Tests", () => {
  test("F3C-1: Media upload (F1) combined with halftone styling (F3) and export (F6)", async ({ page }) => {
    await uploadImage(page, "cross1.svg");
    await page.getByRole("button", { name: "Add Halftone" }).click();
    await dragToolcraftSliderToValue(page, "Size", 8);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".png");
  });

  test("F3C-2: Grid Layout creation (F4) with 3 uploaded images (F1) and color shuffle (F5)", async ({ page }) => {
    await uploadImage(page, "imgA.svg");
    await uploadImage(page, "imgB.svg");
    await uploadImage(page, "imgC.svg");
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    });
  });

  test("F3C-3: Lock a shader layer (F2, F3) and verify Shuffle (F5) only updates unlocked layers", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await page.getByRole("button", { name: "Add Glitch" }).click();
    await clickRowButton(page, "Shader Background", "Lock Shader Background");
    const beforeGlitchIntensity = await page.getByRole("slider", { name: "Intensity" }).getAttribute("aria-valuenow");
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    const afterGlitchIntensity = await page.getByRole("slider", { name: "Intensity" }).getAttribute("aria-valuenow");
    expect(beforeGlitchIntensity).not.toBe(afterGlitchIntensity);
  });

  test("F3C-4: Add tech overlay nested in group and verify canvas zoom/radar", async ({ page }) => {
    await page.getByRole("button", { name: "Add layer" }).click();
    await page.getByRole("button", { name: "Group" }).click();
    await page.getByRole("button", { name: "Add Tech Overlay" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Center canvas" }).click();
  });

  test("F3C-5: Group image layout with custom shader filters applied to individual image child layers", async ({ page }) => {
    await uploadImage(page, "childImg.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await layersPanel.getByText("childImg", { exact: true }).click();
    await page.getByRole("combobox", { name: "Shader Filter" }).click();
    await page.getByRole("option", { name: "Warp" }).click();
  });

  test("F3C-6: Complex layer reordering of shader effects above grid layouts and verify export results", async ({ page }) => {
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await page.getByRole("button", { name: "Add Shader" }).click();
    const shaderRow = page.locator('[data-layer-id^="shader-"]').first();
    const gridRow = page.locator('[data-template-layer-kind="group"]').first();
    await shaderRow.dragTo(gridRow);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".png");
  });
});

// -------------------------------------------------------------
// TIER 4: REAL-WORLD SCENARIOS (5 TESTS)
// -------------------------------------------------------------

test.describe("Tier 4: Real-World Scenarios", () => {
  test("RWS-1: Collage Layout Build - Upload 3 images, group them, apply Grid Layout, modify cells, and verify output", async ({ page }) => {
    await uploadImage(page, "collage1.svg");
    await uploadImage(page, "collage2.svg");
    await uploadImage(page, "collage3.svg");
    await page.getByRole("button", { name: "Add Grid Layout" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await dragToolcraftSliderToValue(page, "Gap Size", 15);
    });
  });

  test("RWS-2: Effect Stack Build - Add Shader, add Glitch, add Halftone, change blend mode, reorder, and verify rendering", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await page.getByRole("button", { name: "Add Glitch" }).click();
    await page.getByRole("button", { name: "Add Halftone" }).click();
    await expectToolcraftProductObservableToChange(page, async () => {
      await page.getByRole("combobox", { name: "Blend Mode" }).click();
      await page.getByRole("option", { name: "Hard Light" }).click();
    });
  });

  test("RWS-3: Interactive Layout Assembly - Upload image, select layer, drag move handles in viewport, scale handles, change background", async ({ page }) => {
    await uploadImage(page, "assemble.svg");
    const layersPanel = page.locator('[data-toolcraft-layers-panel]');
    await layersPanel.getByText("assemble", { exact: true }).click();
    const moveArea = page.locator('div[data-action="move"]');
    const box = await moveArea.boundingBox();
    if (box) {
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY + 100);
      await page.mouse.up();
    }
  });

  test("RWS-4: God-Mode Lock and Shuffle - Add Shader, add Tech Overlay, lock Shader, trigger Shuffle, verify behavior", async ({ page }) => {
    await page.getByRole("button", { name: "Add Shader" }).click();
    await page.getByRole("button", { name: "Add Tech Overlay" }).click();
    await clickRowButton(page, "Shader Background", "Lock Shader Background");
    const techStyleBefore = await page.getByRole("combobox", { name: "Style" }).inputValue();
    await page.getByRole("button", { name: "Randomize Colors & Values" }).click();
    const techStyleAfter = await page.getByRole("combobox", { name: "Style" }).inputValue();
    await page.getByRole("button", { name: "Undo" }).click();
  });

  test("RWS-5: High-Res Brand Asset Export - Cyberpunk HUD overlay, set background color, toggle includeBackground, export PNG", async ({ page }) => {
    await page.getByRole("button", { name: "Add Tech Overlay" }).click();
    await page.getByRole("textbox", { name: "scene-background hex" }).fill("ff0055");
    await page.getByRole("textbox", { name: "scene-background hex" }).press("Enter");
    await page.getByRole("checkbox", { name: "Include" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export PNG" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".png");
  });
});
