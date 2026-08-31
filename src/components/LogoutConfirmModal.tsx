import React from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="logout-confirm-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl text-white animate-in fade-in duration-200"
    >
      <div
        id="logout-confirm-dialog"
        className="bg-gradient-to-b from-[#241313] via-[#1a0c0c] to-[#100606] border-2 border-red-500/60 rounded-3xl p-6 w-full max-w-sm text-center shadow-[0_15px_40px_rgba(220,38,38,0.25)] space-y-5 relative select-none animate-in zoom-in-95 duration-200"
      >
        {/* Close Button Top Left */}
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-gray-400 hover:text-white border border-gray-700/50 transition-all active:scale-95"
          title="إلغاء"
          aria-label="إلغاء"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center mx-auto shadow-lg border-2 border-red-400/40">
          <LogOut className="w-8 h-8 text-white mr-0.5" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="font-black text-lg text-white">
            هل أنت متأكد أنك تريد الخروج من التطبيق؟
          </h3>
          <p className="text-xs text-gray-300 font-medium leading-relaxed">
            سيتم إنهاء الجلسة الحالية وإعادتك إلى شاشة البداية واختيار نوع الدخول.
          </p>
        </div>

        {/* Action Buttons: [مؤكد] and [إلغاء] */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Confirm Button */}
          <button
            id="btn-confirm-logout"
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-red-600 via-red-500 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-black text-sm py-3 rounded-2xl shadow-lg border border-red-400/50 flex items-center justify-center gap-1.5 transition-all"
          >
            <span>مؤكد</span>
          </button>

          {/* Cancel Button */}
          <button
            id="btn-cancel-logout"
            onClick={onCancel}
            className="w-full bg-[#1b1717] hover:bg-gray-800 active:scale-95 text-gray-200 hover:text-white font-bold text-sm py-3 rounded-2xl border border-gray-700/80 flex items-center justify-center transition-all shadow-md"
          >
            <span>إلغاء</span>
          </button>
        </div>
      </div>
    </div>
  );
};
