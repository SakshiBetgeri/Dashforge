import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertCircle, ClipboardCheck } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'copy' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-8 right-8 z-[1000] flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: ToastMessage; onRemove: () => void; key?: any }) => {
  useEffect(() => {
    const timer = setTimeout(onRemove, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const config = {
    success: { icon: Check, bg: 'bg-[#10B981]', text: 'text-white' },
    copy: { icon: ClipboardCheck, bg: 'bg-[#10B981]', text: 'text-white' },
    error: { icon: AlertCircle, bg: 'bg-[#EF4444]', text: 'text-white' }
  };

  const { icon: Icon, bg, text } = config[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className={cn("flex items-center gap-4 px-6 py-4 rounded-xl shadow-[0_10_30px_rgba(0,0,0,0.3)] min-w-[300px] border border-white/10", bg, text)}
    >
      <div className="p-1.5 bg-white/20 rounded-lg">
        <Icon size={16} />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-widest flex-1">{toast.message}</span>
      <button onClick={onRemove} className="p-1 hover:bg-white/10 rounded-full transition-colors">
        <X size={14} />
      </button>
    </motion.div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
