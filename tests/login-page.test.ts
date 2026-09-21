import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import LoginPage from "@/app/login/page";

type ElementProps = {
  href?: string;
  children?: ReactNode;
};

function collectHrefs(node: ReactNode): string[] {
  if (Array.isArray(node)) return node.flatMap(collectHrefs);
  if (!isValidElement<ElementProps>(node)) return [];
  const hrefs = typeof node.props.href === "string" ? [node.props.href] : [];
  return hrefs.concat(collectHrefs(node.props.children));
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (!isValidElement<ElementProps>(node)) return "";
  return collectText(node.props.children);
}

describe("LoginPage account-switching UX", () => {
  it("does not render the broken local switch-account link", () => {
    const page = LoginPage();

    expect(collectHrefs(page)).not.toContain("/api/auth/switch-account");
  });

  it("renders account switching as a same-tab OIDC login action", () => {
    const page = LoginPage();
    const hrefs = collectHrefs(page);
    const text = collectText(page);

    expect(hrefs).toContain("/auth/login");
    expect(hrefs).not.toContain("https://account.daiyooo.com");
    expect(text).toContain("ต้องการเปลี่ยนบัญชีหรืออีเมล");
    expect(text).toContain("เปลี่ยนบัญชี/เปลี่ยนอีเมล");
    expect(text).not.toContain("account.daiyooo.com");
  });
});
