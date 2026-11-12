import type { Page } from "@playwright/test";

/** Reduce flakes por red en specs de UI. */
export async function stubMediaRoutes(page: Page): Promise<void> {
  await page.route("**/api/media/pexels**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "/media/pilot-entrance.jpg" }),
    });
  });
  await page.route("**/api/media/fal-image", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "/media/pilot-entrance.jpg" }),
    });
  });
  await page.route("https://cdn.pixabay.com/**", (route) => route.abort());
}
