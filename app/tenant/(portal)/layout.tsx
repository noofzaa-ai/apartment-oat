import TenantTopNav from "@/components/TenantTopNav";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFF8F3" }}>
      <TenantTopNav />
      {children}
    </div>
  );
}
