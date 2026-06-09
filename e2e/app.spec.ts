import { test, expect } from "@playwright/test";

test.describe("Career Search E2E", () => {
  test("首页加载正常", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Career Search")).toBeVisible();
    await expect(page.locator("text=岗位")).toBeVisible();
  });

  test("首页有岗位卡片", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator(".card");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(5);
  });

  test("筛选功能正常", async ({ page }) => {
    await page.goto("/");
    // 点击行业筛选
    await page.click("text=互联网");
    await page.waitForTimeout(500);
    // 结果应该变化
    const resultText = await page.locator("text=条").first().textContent();
    expect(resultText).toBeTruthy();
  });

  test("搜索功能正常", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[placeholder*="搜索"]', "字节");
    await page.waitForTimeout(500);
    const results = page.locator("text=字节跳动");
    await expect(results.first()).toBeVisible();
  });

  test("日历视图切换", async ({ page }) => {
    await page.goto("/");
    await page.click("text=日历");
    await expect(page.locator("text=日")).toBeVisible();
    await expect(page.locator("text=一")).toBeVisible();
  });

  test("岗位详情页", async ({ page }) => {
    await page.goto("/");
    // 点击第一个公司名进入详情
    const firstCompany = page.locator("a[href^='/job/']").first();
    await firstCompany.click();
    await page.waitForURL(/\/job\//);
    await expect(page.locator("text=投递")).toBeVisible();
  });

  test("画像页面", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("text=上传简历")).toBeVisible();
  });

  test("求职报告页面", async ({ page }) => {
    await page.goto("/report");
    // 未设画像时显示引导
    await expect(page.locator("text=画像")).toBeVisible();
  });

  test("AI 工具页面", async ({ page }) => {
    await page.goto("/skills");
    await expect(page.locator("text=面试题定制")).toBeVisible();
    await expect(page.locator("text=简历润色")).toBeVisible();
    await expect(page.locator("text=求职信生成")).toBeVisible();
    await expect(page.locator("text=Offer 对比")).toBeVisible();
  });

  test("宣讲活动页面", async ({ page }) => {
    await page.goto("/events");
    await expect(page.locator("text=宣讲")).toBeVisible();
    await expect(page.locator("text=公众号推送")).toBeVisible();
  });

  test("投递管理页面", async ({ page }) => {
    await page.goto("/timeline");
    await expect(page.locator("text=投递管理")).toBeVisible();
  });

  test("暗色模式切换", async ({ page }) => {
    await page.goto("/");
    // 找到主题切换按钮
    const themeBtn = page.locator("button[title*='切换']");
    await themeBtn.click();
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");
  });
});
