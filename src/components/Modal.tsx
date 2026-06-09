"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert';
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  type = 'alert',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
    >
      <div
        className="absolute inset-0 bg-gray-900 opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 id="app-modal-title" className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
          <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>

          <div className="flex gap-3 justify-end">
            {type === 'confirm' && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 cursor-pointer bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                type === 'confirm'
                  ? 'cursor-pointer bg-red-600 text-white hover:bg-red-700'
                  : 'btn-wedding-primary cursor-pointer hover:bg-[#9f1239]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
