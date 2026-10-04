import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ProfileDropdown({ user, onLogout, onChangePassword }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const menuItems = [
    { icon: '👤', label: 'Account Settings', to: '/settings' },
    { icon: '🔑', label: 'Change Password', onClick: onChangePassword },
    { icon: '📱', label: 'Trusted Devices', to: '/devices' },
    { divider: true },
    { icon: '🚪', label: 'Logout', onClick: onLogout, danger: true },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-semibold">
          {user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-gray-700 hidden sm:block">{user?.email}</span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border py-2 z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            <p className="text-xs text-gray-500">{user?.plan?.name || 'Free'} Plan</p>
          </div>
          {menuItems.map((item, i) =>
            item.divider ? (
              <div key={i} className="border-t my-1" />
            ) : item.to ? (
              <Link
                key={i}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span>{item.icon}</span> {item.label}
              </Link>
            ) : (
              <button
                key={i}
                onClick={() => { item.onClick?.(); setIsOpen(false); }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${item.danger ? 'text-red-500' : 'text-gray-700'}`}
              >
                <span>{item.icon}</span> {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
