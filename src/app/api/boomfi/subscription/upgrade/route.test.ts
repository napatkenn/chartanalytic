import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { getServerSession } from "next-auth";
import { getSubscriptionRecord, updateSubscriptionTier } from "@/lib/subscription";
import { updateBoomFiSubscriptionPlan } from "@/lib/boomfi";
import { getBoomFiPlanId } from "@/lib/plans";

const mockSession = { user: { id: "user-1", email: "u@test.com", name: "User" } };
const mockRecord = {
  id: "sub-1",
  userId: "user-1",
  status: "active" as const,
  planTier: "starter",
  boomfiSubscriptionId: "bf-sub-123",
  currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  getSubscriptionRecord: vi.fn(),
  updateSubscriptionTier: vi.fn(),
}));

vi.mock("@/lib/boomfi", () => ({
  updateBoomFiSubscriptionPlan: vi.fn(),
}));

vi.mock("@/lib/plans", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/plans")>();
  return {
    ...actual,
    getBoomFiPlanId: vi.fn(),
  };
});

async function postWithBody(body: { tier: string }) {
  const req = new Request("http://localhost/api/boomfi/subscription/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe("POST /api/boomfi/subscription/upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never);
    vi.mocked(getSubscriptionRecord).mockResolvedValue(mockRecord);
    vi.mocked(updateBoomFiSubscriptionPlan).mockResolvedValue(undefined);
    vi.mocked(updateSubscriptionTier).mockResolvedValue(undefined);
    vi.mocked(getBoomFiPlanId).mockReturnValue("plan-active");
    process.env.ENABLE_DEMO_SUBSCRIPTION = "false";
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await postWithBody({ tier: "active" });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/unauthorized/i);
  });

  it("returns 400 for invalid tier", async () => {
    const res = await postWithBody({ tier: "invalid" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid/i);
  });

  it("returns 404 when user has no active subscription", async () => {
    vi.mocked(getSubscriptionRecord).mockResolvedValue(null);
    const res = await postWithBody({ tier: "active" });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/no active subscription/i);
  });

  it("returns 400 when subscription has no boomfiSubscriptionId", async () => {
    vi.mocked(getSubscriptionRecord).mockResolvedValue({
      ...mockRecord,
      boomfiSubscriptionId: null,
    });
    const res = await postWithBody({ tier: "active" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/missing BoomFi link/i);
  });

  it("returns 400 when target tier is not an upgrade (same or lower)", async () => {
    const resSame = await postWithBody({ tier: "starter" });
    expect(resSame.status).toBe(400);
    const dataSame = await resSame.json();
    expect(dataSame.error).toMatch(/only upgrades/i);

    vi.mocked(getSubscriptionRecord).mockResolvedValue({ ...mockRecord, planTier: "advanced" });
    const resLower = await postWithBody({ tier: "active" });
    expect(resLower.status).toBe(400);
  });

  it("in demo mode updates tier and returns success without calling BoomFi", async () => {
    process.env.ENABLE_DEMO_SUBSCRIPTION = "true";
    const res = await postWithBody({ tier: "advanced" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.redirectUrl).toMatch(/upgraded=1/);
    expect(updateSubscriptionTier).toHaveBeenCalledWith("user-1", "advanced");
    expect(updateBoomFiSubscriptionPlan).not.toHaveBeenCalled();
  });

  it("returns 503 when BOOMFI_PLAN_ID for target tier is not set", async () => {
    vi.mocked(getBoomFiPlanId).mockReturnValue(null);
    const res = await postWithBody({ tier: "active" });
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toMatch(/not configured/i);
    expect(updateSubscriptionTier).not.toHaveBeenCalled();
  });

  it("calls BoomFi to update plan then updates local tier and returns success", async () => {
    const res = await postWithBody({ tier: "active" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.redirectUrl).toMatch(/subscribe\?upgraded=1/);

    expect(updateBoomFiSubscriptionPlan).toHaveBeenCalledWith("bf-sub-123", "plan-active");
    expect(updateSubscriptionTier).toHaveBeenCalledWith("user-1", "active");
  });

  it("returns 502 when BoomFi subscription update throws", async () => {
    vi.mocked(updateBoomFiSubscriptionPlan).mockRejectedValue(new Error("BoomFi error"));
    const res = await postWithBody({ tier: "active" });
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toMatch(/billing provider/i);
    expect(updateSubscriptionTier).not.toHaveBeenCalled();
  });

  it("upgrade to advanced: calls BoomFi with advanced plan id then updates tier", async () => {
    vi.mocked(getSubscriptionRecord).mockResolvedValue({ ...mockRecord, planTier: "active" });
    vi.mocked(getBoomFiPlanId).mockImplementation((tier) => (tier === "advanced" ? "plan-advanced" : null));

    const res = await postWithBody({ tier: "advanced" });
    expect(res.status).toBe(200);
    expect(updateBoomFiSubscriptionPlan).toHaveBeenCalledWith("bf-sub-123", "plan-advanced");
    expect(updateSubscriptionTier).toHaveBeenCalledWith("user-1", "advanced");
  });
});
