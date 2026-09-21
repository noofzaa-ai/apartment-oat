import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tenantDashboardSource = readFileSync("app/tenant/(portal)/dashboard/page.tsx", "utf8");
const appSidebarSource = readFileSync("components/AppSidebar.tsx", "utf8");
const tenantTopNavSource = readFileSync("components/TenantTopNav.tsx", "utf8");

describe("tenant/owner UI role policy", () => {
  it("tenant dashboard no-room state shows owner-mode CTA to /app/locations", () => {
    expect(tenantDashboardSource).toContain("สร้างหอ / ใช้งานโหมดเจ้าของ");
    expect(tenantDashboardSource).toContain('href="/app/locations"');
    expect(tenantDashboardSource).toContain("ยังไม่ได้ผูกห้อง");
  });

  it("tenant dashboard still renders apartment and room details when a room exists", () => {
    expect(tenantDashboardSource).toContain("ข้อมูลห้องของคุณ");
    expect(tenantDashboardSource).toContain('value={room.location.name}');
    expect(tenantDashboardSource).toContain('value={room.roomNumber}');
    expect(tenantDashboardSource).toContain('detail={`ห้อง ${room.roomNumber}`}');
  });

  it("owner sidebar links to tenant dashboard from /api/me tenant-mode flags", () => {
    expect(appSidebarSource).toContain('href="/tenant/dashboard"');
    expect(appSidebarSource).toContain("data.user.isTenant");
    expect(appSidebarSource).toContain("data.user.canViewTenantMode");
  });

  it("tenant top nav detects owner mode from the nested /api/me user payload", () => {
    // TenantTopNav uses 'd' as response variable; check it reads the nested user property
    expect(tenantTopNavSource).toContain("d.user.isOwner");
    expect(tenantTopNavSource).toContain('href="/app/locations"');
  });
});
