'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout, isAdmin } from '@/lib/auth';

const navItems = [
  { href: '/admin/dashboard',     icon: '⊞',  label: 'Dashboard' },
  { href: '/admin/students',      icon: '🎓',  label: 'Students' },
  { href: '/admin/users',         icon: '👥',  label: 'Users' },
  { href: '/admin/courses',       icon: '📚',  label: 'Courses' },
  { href: '/admin/timetable',     icon: '📅',  label: 'Timetable' },
  { href: '/admin/face-register', icon: '🛡️',  label: 'Face Registration' },
  { href: '/admin/reports',       icon: '📊',  label: 'Reports' },
  { href: '/admin/settings',      icon: '⚙️',  label: 'Settings' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u || !isAdmin(u)) {
      logout();
      router.replace('/');
      return;
    }
    setUser(u);
  }, [router]);

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  if (!user) return null;

  return (
    <div className="layout-wrapper">
      <nav className="sidebar">
        <div className="logo">
          <div className="logo-icon">🎓</div>
          <span className="logo-text">FOC Admin</span>
        </div>

        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.href} className="nav-item">
              <Link
                href={item.href}
                className={`nav-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-footer">
          <div className="user-info">
            <div className="user-avatar">{user.user_id?.[0] ?? 'A'}</div>
            <div>
              <div className="user-id">{user.user_id}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            <span>↪</span> Logout
          </button>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
