import React, { useState, useRef, useEffect } from 'react';
import { ChangePasswordModal } from './ChangePasswordModal';

export function UserMenu({ email, isAdmin, onLogout, onOpenAdmin }) {
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickFora(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
      >
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
          {email?.[0]?.toUpperCase() || '?'}
        </span>
        <span className="hidden sm:inline text-gray-700 truncate max-w-[160px]">{email}</span>
        <span className="text-gray-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-20">
          <div className="px-4 py-2 text-xs text-gray-500 border-b truncate">{email}</div>

          <button
            onClick={() => {
              setShowChangePassword(true);
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
          >
            🔑 Alterar minha senha
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                onOpenAdmin();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
            >
              🛡️ Painel de administração
            </button>
          )}

          <div className="border-t my-1"></div>

          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            🚪 Sair
          </button>
        </div>
      )}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}
