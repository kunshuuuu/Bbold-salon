import React, { useEffect, useRef, useState } from 'react';
import {
  HelpCircle,
  MoreVertical,
  Search,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { uploadMediaImage } from '../../lib/adminApi';

// =============================================================================
// 1. PAGE HEADER (Title, one plain sentence, primary action, "What is this?" popover)
// =============================================================================

export interface PageHeaderProps {
  title: string;
  description: string;
  helpText?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  helpText,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActions,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6E2DB] mb-6 min-w-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[24px] leading-[32px] font-semibold text-[#15110F] truncate">
            {title}
          </h1>
          {helpText && <HelpPopover text={helpText} />}
        </div>
        <p className="text-[14px] leading-[20px] text-[#6B6560] mt-1">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {secondaryActions}
        {primaryActionLabel && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="px-4 py-2 rounded-[8px] bg-[#C4262E] text-white text-[14px] leading-[20px] font-medium hover:opacity-95 transition-opacity duration-150 cursor-pointer whitespace-nowrap"
          >
            {primaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// 2. HELP POPOVER ("What is this?")
// =============================================================================

export const HelpPopover: React.FC<{ text: string }> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-[8px] text-[12px] leading-[16px] font-medium text-[#6B6560] hover:text-[#15110F] hover:bg-[#E6E2DB]/50 transition-colors cursor-pointer"
      >
        <HelpCircle size={16} aria-hidden="true" />
        <span>What is this?</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Help information"
          className="absolute left-0 top-full mt-2 w-72 p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] shadow-lg z-40 text-[14px] leading-[20px] text-[#15110F]"
        >
          <p>{text}</p>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 3. TOOLBAR (Search + Filters)
// =============================================================================

export interface ToolbarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 min-w-0">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-sm min-w-0">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6560]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] leading-[20px] text-[#15110F] focus:outline-none focus:border-[#C4262E]"
          />
        </div>
      )}
      {children && <div className="flex flex-wrap items-center gap-2 min-w-0">{children}</div>}
    </div>
  );
};

// =============================================================================
// 4. STATUS BADGE (Plain language: Published / Hidden, Sample, Appointment Status)
// =============================================================================

export const StatusBadge: React.FC<{
  variant:
    | 'published'
    | 'hidden'
    | 'sample'
    | 'pending'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'new'
    | 'contacted'
    | 'enrolled'
    | 'closed';
  label?: string;
}> = ({ variant, label }) => {
  const styles: Record<string, { bg: string; text: string; defaultLabel: string }> = {
    published: { bg: '#1E7B4F/12', text: '#1E7B4F', defaultLabel: 'Published' },
    hidden: { bg: '#6B6560/15', text: '#6B6560', defaultLabel: 'Hidden' },
    sample: { bg: '#B7791F/15', text: '#B7791F', defaultLabel: 'Sample' },
    pending: { bg: '#B7791F/15', text: '#B7791F', defaultLabel: 'Pending' },
    confirmed: { bg: '#2F5D8A/15', text: '#2F5D8A', defaultLabel: 'Confirmed' },
    completed: { bg: '#1E7B4F/15', text: '#1E7B4F', defaultLabel: 'Completed' },
    cancelled: { bg: '#B3261E/15', text: '#B3261E', defaultLabel: 'Cancelled' },
    new: { bg: '#C4262E/15', text: '#C4262E', defaultLabel: 'New' },
    contacted: { bg: '#2F5D8A/15', text: '#2F5D8A', defaultLabel: 'Contacted' },
    enrolled: { bg: '#1E7B4F/15', text: '#1E7B4F', defaultLabel: 'Enrolled' },
    closed: { bg: '#6B6560/15', text: '#6B6560', defaultLabel: 'Closed' },
  };

  const cfg = styles[variant] || styles.hidden;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[12px] leading-[16px] font-medium whitespace-nowrap shrink-0 border"
      style={{
        color: cfg.text,
        borderColor: `${cfg.text}33`,
        backgroundColor: `${cfg.text}14`,
      }}
    >
      {label || cfg.defaultLabel}
    </span>
  );
};

// =============================================================================
// 5. KEBAB MENU
// =============================================================================

export interface KebabAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

export const KebabMenu: React.FC<{ actions: KebabAction[]; label?: string }> = ({
  actions,
  label = 'More actions',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={label}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E6E2DB] bg-[#FFFFFF] text-[12px] leading-[16px] font-medium text-[#15110F] hover:bg-[#F6F4F0] cursor-pointer"
      >
        <MoreVertical size={16} aria-hidden="true" />
        <span>Actions</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-48 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] shadow-lg z-40 py-1">
          {actions.map((act, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOpen(false);
                act.onClick();
              }}
              className={`w-full text-left px-3 py-2 text-[14px] leading-[20px] hover:bg-[#F6F4F0] transition-colors cursor-pointer ${
                act.danger ? 'text-[#B3261E]' : 'text-[#15110F]'
              }`}
            >
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 6. DRAWER (Right side, 480px on desktop, full-screen on mobile, focus-trapped, unsaved guard)
// =============================================================================

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  isDirty?: boolean;
  isSaving?: boolean;
  saveLabel?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  title,
  onClose,
  onSave,
  isDirty = false,
  isSaving = false,
  saveLabel = 'Save changes',
  children,
}) => {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const attemptClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!open) {
      setConfirmDiscard(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        attemptClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, isDirty]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-[#15110F]/40">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full sm:w-[480px] h-full bg-[#FFFFFF] border-l border-[#E6E2DB] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6E2DB] flex items-center justify-between gap-4 shrink-0">
          <h2 className="text-[16px] leading-[24px] font-semibold text-[#15110F] truncate">
            {title}
          </h2>
          <button
            type="button"
            onClick={attemptClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] leading-[16px] font-medium text-[#6B6560] hover:text-[#15110F] hover:bg-[#F6F4F0] cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
            <span>Close</span>
          </button>
        </div>

        {/* Unsaved Changes Banner */}
        {confirmDiscard && (
          <div className="px-6 py-3 bg-[#B7791F]/10 border-b border-[#B7791F]/30 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[12px] leading-[16px] font-medium text-[#15110F]">
              You have unsaved changes. Discard them?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="px-2.5 py-1 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[12px] font-medium cursor-pointer"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-[8px] bg-[#B3261E] text-white text-[12px] font-medium cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={onSave} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>

          {/* Sticky Footer */}
          <div className="px-6 py-4 bg-[#F6F4F0] border-t border-[#E6E2DB] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={attemptClose}
              className="px-4 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] leading-[20px] font-medium text-[#15110F] hover:bg-[#E6E2DB]/40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-[8px] bg-[#C4262E] text-white text-[14px] leading-[20px] font-medium hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Saving...' : saveLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// 7. CONFIRM DIALOG
// =============================================================================

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#15110F]/40 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] p-6 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            className={danger ? 'text-[#B3261E] shrink-0 mt-0.5' : 'text-[#B7791F] shrink-0 mt-0.5'}
          />
          <div>
            <h3
              id="confirm-dialog-title"
              className="text-[16px] leading-[24px] font-semibold text-[#15110F]"
            >
              {title}
            </h3>
            <p className="text-[14px] leading-[20px] text-[#6B6560] mt-1">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] leading-[20px] font-medium text-[#15110F] hover:bg-[#F6F4F0] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-[8px] text-white text-[14px] leading-[20px] font-medium cursor-pointer ${
              danger ? 'bg-[#B3261E]' : 'bg-[#C4262E]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 8. TOAST (aria-live with optional 10-second Undo)
// =============================================================================

export interface ToastMessage {
  id: string;
  text: string;
  onUndo?: () => void;
}

export const ToastContainer: React.FC<{
  toast: ToastMessage | null;
  onDismiss: () => void;
}> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[300] max-w-md rounded-[12px] bg-[#15110F] text-[#FFFFFF] px-4 py-3 shadow-xl flex items-center gap-3"
    >
      <Check size={18} className="text-[#1E7B4F] shrink-0" aria-hidden="true" />
      <span className="text-[14px] leading-[20px]">{toast.text}</span>
      {toast.onUndo && (
        <button
          type="button"
          onClick={() => {
            toast.onUndo?.();
            onDismiss();
          }}
          className="px-2.5 py-1 rounded-[8px] bg-[#C4262E] text-white text-[12px] leading-[16px] font-medium cursor-pointer whitespace-nowrap"
        >
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-[#FFFFFF]/70 hover:text-[#FFFFFF] cursor-pointer ml-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// =============================================================================
// 9. FORM FIELD & REAL CONTENT TOGGLE
// =============================================================================

export const FormField: React.FC<{
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, error, required, children }) => {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12px] leading-[16px] font-medium text-[#15110F]">
        {label} {required && <span className="text-[#C4262E]">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] leading-[16px] text-[#6B6560]">{hint}</p>}
      {error && <p className="text-[12px] leading-[16px] text-[#B3261E]">{error}</p>}
    </div>
  );
};

/**
 * Each edit drawer has a "This is real content now" toggle (default on) that clears is_sample.
 */
export const RealContentToggle: React.FC<{
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ checked, onChange }) => {
  return (
    <div className="p-3 rounded-[8px] bg-[#F6F4F0] border border-[#E6E2DB] flex items-center justify-between gap-3">
      <div>
        <div className="text-[12px] leading-[16px] font-medium text-[#15110F]">
          This is real content now
        </div>
        <div className="text-[12px] leading-[16px] text-[#6B6560] mt-0.5">
          Removes the &ldquo;Sample&rdquo; badge so this item stays visible when sample mode is
          turned off.
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="This is real content now"
        className="w-4 h-4 accent-[#C4262E] shrink-0 cursor-pointer"
      />
    </div>
  );
};

// =============================================================================
// 10. IMAGE UPLOADER (Drag-drop, preview, replace, remove, required alt text, WebP 1600px)
// =============================================================================

export interface ImageUploaderProps {
  label: string;
  imageUrl: string | null;
  altText?: string;
  onChange: (url: string | null, alt: string) => void;
  requireAlt?: boolean;
  folder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  imageUrl,
  altText = '',
  onChange,
  requireAlt = false,
  folder = 'uploads',
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploadedUrl = await uploadMediaImage(file, folder);
      onChange(uploadedUrl, altText || file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-[12px] leading-[16px] font-medium text-[#15110F]">{label}</div>

      {imageUrl ? (
        <div className="p-3 rounded-[12px] bg-[#F6F4F0] border border-[#E6E2DB] space-y-3">
          <div className="w-full h-44 rounded-[8px] overflow-hidden bg-[#FFFFFF] border border-[#E6E2DB]">
            <img
              src={imageUrl}
              alt={altText || 'Uploaded preview'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[12px] font-medium hover:bg-[#E6E2DB]/40 cursor-pointer"
            >
              Replace photo
            </button>
            <button
              type="button"
              onClick={() => onChange(null, altText)}
              className="px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[12px] font-medium text-[#B3261E] hover:bg-[#B3261E]/10 cursor-pointer"
            >
              Remove photo
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className="p-6 rounded-[12px] border-2 border-dashed border-[#E6E2DB] bg-[#F6F4F0]/60 hover:bg-[#F6F4F0] text-center cursor-pointer transition-colors"
        >
          <Upload size={20} className="mx-auto text-[#6B6560] mb-2" />
          <div className="text-[14px] leading-[20px] font-medium text-[#15110F]">
            {uploading ? 'Resizing to WebP & uploading...' : 'Drop an image here or click to browse'}
          </div>
          <div className="text-[12px] leading-[16px] text-[#6B6560] mt-1">
            Automatically resized to max 1600px and converted to WebP
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        className="hidden"
      />

      {requireAlt && (
        <div className="pt-1">
          <label className="block text-[12px] leading-[16px] font-medium text-[#15110F] mb-1">
            Image description (alt text for screen readers) *
          </label>
          <input
            type="text"
            required={Boolean(imageUrl)}
            value={altText}
            onChange={(e) => onChange(imageUrl, e.target.value)}
            placeholder="Describe what is shown in the photo"
            className="w-full px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E6E2DB] text-[14px] text-[#15110F]"
          />
        </div>
      )}

      {error && <p className="text-[12px] text-[#B3261E]">{error}</p>}
    </div>
  );
};

// =============================================================================
// 11. EMPTY STATE & SKELETON & SORT CONTROLS
// =============================================================================

export const EmptyState: React.FC<{
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title = 'Nothing here yet', description, actionLabel, onAction }) => {
  return (
    <div className="p-10 rounded-[12px] bg-[#FFFFFF] border border-[#E6E2DB] text-center">
      <h3 className="text-[16px] leading-[24px] font-semibold text-[#15110F]">{title}</h3>
      <p className="text-[14px] leading-[20px] text-[#6B6560] mt-1 max-w-md mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-[8px] bg-[#C4262E] text-white text-[14px] leading-[20px] font-medium cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const AdminSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-[12px] bg-[#E6E2DB]/60 animate-pulse"
        />
      ))}
    </div>
  );
};

export const ReorderButtons: React.FC<{
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
}> = ({ onMoveUp, onMoveDown, disableUp, disableDown }) => {
  return (
    <div className="inline-flex items-center gap-1 text-[#6B6560]">
      <GripVertical size={16} aria-hidden="true" className="text-[#6B6560]/60 mr-0.5" />
      <button
        type="button"
        disabled={disableUp}
        onClick={onMoveUp}
        aria-label="Move up"
        className="p-1 rounded hover:bg-[#F6F4F0] disabled:opacity-30 cursor-pointer"
      >
        <ArrowUp size={15} />
      </button>
      <button
        type="button"
        disabled={disableDown}
        onClick={onMoveDown}
        aria-label="Move down"
        className="p-1 rounded hover:bg-[#F6F4F0] disabled:opacity-30 cursor-pointer"
      >
        <ArrowDown size={15} />
      </button>
    </div>
  );
};
