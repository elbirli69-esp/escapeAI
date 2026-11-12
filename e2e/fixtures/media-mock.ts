import { expect, type Page } from "@playwright/test";

/** Simula cámara con canvas para specs headless (flujo UI real). */
export async function mockCameraForPlaywright(page: Page): Promise<void> {
  await page.context().grantPermissions(["camera"]);
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.fillStyle = "#1a2744";
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 120px sans-serif";
      ctx.fillText("7", 580, 400);
      window.setInterval(() => {
        ctx.fillStyle = "#1a2744";
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 120px sans-serif";
        ctx.fillText("7", 580, 400);
      }, 100);
      return canvas.captureStream(15);
    };
  });
}

export async function captureCameraThroughUi(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const capture = page.getByTestId("escape-camera-capture");
  await expect(capture).toBeEnabled({ timeout: 20_000 });
  const actionWait = page.waitForResponse(
    (res) => res.url().includes("/actions") && res.request().method() === "POST",
    { timeout: 30_000 },
  );
  await capture.click();
  await actionWait;
  await expect(page.locator(".camera-shot")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("escape-narrative-log")).toContainText("Foto registrada", {
    timeout: 15_000,
  });
}
