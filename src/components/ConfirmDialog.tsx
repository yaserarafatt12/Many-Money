import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/55"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 w-full max-w-[300px] ios-card rounded-[20px] overflow-hidden text-center shadow-2xl"
          >
            <div className="px-5 pt-5 pb-4">
              <h3 className="text-[16px] font-bold mb-1.5">{title}</h3>
              <p className="text-[13px] text-[var(--text-secondary)] leading-snug">{description}</p>
            </div>
            <div
              className="grid grid-cols-2 border-t divide-x"
              style={{ borderColor: 'var(--ios-separator)' }}
            >
              <button
                type="button"
                onClick={onCancel}
                className="py-3 text-[15px] font-medium text-[var(--text-secondary)] active:bg-[var(--ios-fill-secondary)]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="py-3 text-[15px] font-semibold active:bg-[var(--ios-fill-secondary)]"
                style={{ color: 'var(--sys-blue)' }}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
