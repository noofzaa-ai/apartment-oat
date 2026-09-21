import AdminSidebar from "./components/AdminSidebar";
import "./admin.css";

export const metadata = {
  title: "Admin Panel - ระบบจัดการหอพัก",
  description: "Platform Administration",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main-content">{children}</main>
    </div>
  );
}
