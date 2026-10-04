import { useEffect, useRef, useState } from 'react';

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const handleScroll = () => onClose();
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      let newX = x, newY = y;
      if (x + rect.width > vw - 16) newX = vw - rect.width - 16;
      if (y + rect.height > vh - 16) newY = vh - rect.height - 16;
      if (newX < 16) newX = 16;
      if (newY < 16) newY = 16;
      setPosition({ x: newX, y: newY });
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.15)] border border-gray-200/80 py-1.5 z-[100] min-w-[240px]"
      style={{ left: position.x, top: position.y, animation: 'fadeIn 0.1s ease-out' }}
    >
      {items.map((item, i) => 
        item.divider ? (
          <div key={i} className="border-t border-gray-200 my-1.5" />
        ) : (
          <button
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            disabled={item.disabled}
            className={`w-full px-3 py-2 text-left text-[13px] flex items-center gap-3 transition-colors
              ${item.disabled ? 'text-gray-400 cursor-not-allowed' : item.danger ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-700 hover:bg-gray-100'}
            `}
          >
            <span className="w-5 h-5 flex items-center justify-center text-gray-500">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>
  );
}
