import TenantTopNav from "@/components/TenantTopNav";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#FFF8F0" // Cream/off-white background like LearnHub
    }}>
      <TenantTopNav />
      {children}
    </div>
  );
}
