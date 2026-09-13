import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <AdminSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
