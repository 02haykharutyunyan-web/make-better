import { expect, test, type Page } from "@playwright/test";

const credentials = {
  creator: { email: process.env.E2E_CREATOR_EMAIL, password: process.env.E2E_CREATOR_PASSWORD },
  admin: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD },
};

async function login(page: Page, account: keyof typeof credentials) {
  const { email, password } = credentials[account];
  test.skip(!email || !password, `Set E2E_${account.toUpperCase()}_EMAIL and E2E_${account.toUpperCase()}_PASSWORD`);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(account === "admin" ? /\/admin\/?$/ : /\/creator-dashboard\/?$/);
}

test("complete creator blog moderation lifecycle", async ({ browser }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title = `QA Blog ${unique}`;
  const latestTitle = `${title} latest`;
  const slug = `qa-blog-${unique}`;
  const rejectionReason = `QA revision requested ${unique}`;
  const creator = await browser.newContext();
  const creatorPage = await creator.newPage();
  const admin = await browser.newContext();
  const adminPage = await admin.newPage();

  try {
    await login(creatorPage, "creator");
    await creatorPage.getByRole("link", { name: "New blog draft" }).click();
    await creatorPage.getByLabel("Title").fill(title);
    await creatorPage.getByLabel("Slug").fill(slug);
    await creatorPage.getByLabel("Excerpt").fill(`Initial QA excerpt ${unique}`);
    await creatorPage.getByLabel("Post content").fill(`Initial QA body ${unique}`);
    await creatorPage.getByRole("button", { name: "Save draft" }).click();
    await expect(creatorPage.getByText("Draft saved.")).toBeVisible();

    await creatorPage.getByRole("link", { name: "Preview" }).click();
    await expect(creatorPage.getByRole("status")).toHaveText("PREVIEW — NOT PUBLIC");
    await expect(creatorPage.getByRole("heading", { name: title })).toBeVisible();
    await creatorPage.goto(`/creator-dashboard/blog/${slug}/edit`);

    await creatorPage.getByLabel("Title").fill(latestTitle);
    await creatorPage.getByLabel("Excerpt").fill(`Automatically saved excerpt ${unique}`);
    const submit = creatorPage.getByRole("button", { name: "Submit for review" });
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(creatorPage.getByText("Blog post submitted for review.")).toBeVisible();
    await expect(creatorPage).toHaveURL(/\/creator-dashboard\/?$/);
    const creatorCard = creatorPage.locator("div.card-premium").filter({ hasText: latestTitle }).last();
    await expect(creatorCard.getByText("Pending Review")).toBeVisible();
    await expect(creatorCard.getByRole("link", { name: "Edit" })).toHaveCount(0);
    await creatorCard.getByRole("link", { name: "Preview" }).click();
    await expect(creatorPage.getByText(`Automatically saved excerpt ${unique}`)).toBeVisible();

    await login(adminPage, "admin");
    await adminPage.goto("/admin/blog");
    let row = adminPage.getByRole("row").filter({ hasText: latestTitle });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Reject" }).click();
    await adminPage.getByLabel("Rejection reason").fill(rejectionReason);
    await adminPage.getByRole("button", { name: "Confirm" }).click();
    await expect(adminPage.getByText("Blog post rejected.")).toBeVisible();

    await creatorPage.goto("/creator-dashboard");
    const rejectedCard = creatorPage.locator("div.card-premium").filter({ hasText: latestTitle }).last();
    await expect(rejectedCard.getByText(rejectionReason)).toBeVisible();
    await rejectedCard.getByRole("link", { name: "Edit" }).click();
    await creatorPage.getByLabel("Post content").fill(`Revised QA body ${unique}`);
    await creatorPage.getByRole("button", { name: "Resubmit for review" }).click();
    await expect(creatorPage.getByText("Blog post submitted for review.")).toBeVisible();

    await adminPage.goto("/admin/blog");
    row = adminPage.getByRole("row").filter({ hasText: latestTitle });
    await row.getByRole("button", { name: "Publish" }).click();
    await adminPage.getByRole("button", { name: "Confirm" }).click();
    await expect(adminPage.getByText("Blog post published.")).toBeVisible();

    await creatorPage.goto(`/blog/${slug}`);
    await expect(creatorPage.getByRole("heading", { name: latestTitle })).toBeVisible();
    await expect(creatorPage.getByText(`Revised QA body ${unique}`)).toBeVisible();
    await creatorPage.goto("/creator-dashboard");
    const publishedCard = creatorPage.locator("div.card-premium").filter({ hasText: latestTitle }).last();
    await expect(publishedCard.getByRole("link", { name: "Preview" })).toHaveCount(0);
    const viewPost = publishedCard.getByRole("link", { name: "View post" });
    await expect(viewPost).toHaveAttribute("href", `/blog/${slug}`);
    await viewPost.click();
    await expect(creatorPage).toHaveURL(new RegExp(`/blog/${slug}$`));

    const anonymous = await browser.newPage();
    await anonymous.goto(`/creator-dashboard/blog/${slug}/preview`);
    await expect(anonymous).toHaveURL(/\/login\/?$/);
    await anonymous.close();
  } finally {
    // Best-effort cleanup uses the admin UI and deletes only this unique QA record.
    if (credentials.admin.email && credentials.admin.password) {
      await adminPage.goto("/admin/blog").catch(() => undefined);
      await adminPage.getByRole("button", { name: "All", exact: true }).click().catch(() => undefined);
      const row = adminPage.getByRole("row").filter({ hasText: latestTitle });
      if (await row.count()) await row.getByRole("button", { name: "Delete" }).click().catch(() => undefined);
    }
    await creator.close();
    await admin.close();
  }
});
