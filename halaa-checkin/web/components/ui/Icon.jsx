'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';
import styles from './Icon.module.css';

const ICON_MAP = {
  search: LucideIcons.Search,
  check: LucideIcons.Check,
  x: LucideIcons.X,
  close: LucideIcons.X,
  'chevron-down': LucideIcons.ChevronDown,
  'chevron-up': LucideIcons.ChevronUp,
  'chevron-left': LucideIcons.ChevronLeft,
  'chevron-right': LucideIcons.ChevronRight,
  user: LucideIcons.User,
  users: LucideIcons.Users,
  camera: LucideIcons.Camera,
  qr: LucideIcons.QrCode,
  qrcode: LucideIcons.QrCode,
  printer: LucideIcons.Printer,
  print: LucideIcons.Printer,
  download: LucideIcons.Download,
  settings: LucideIcons.Settings,
  lock: LucideIcons.Lock,
  unlock: LucideIcons.LockOpen || LucideIcons.Unlock,
  logout: LucideIcons.LogOut,
  globe: LucideIcons.Globe,
  'alert-triangle': LucideIcons.AlertTriangle || LucideIcons.TriangleAlert,
  warning: LucideIcons.AlertTriangle || LucideIcons.TriangleAlert,
  'alert-circle': LucideIcons.AlertCircle || LucideIcons.CircleAlert,
  error: LucideIcons.AlertCircle || LucideIcons.CircleAlert,
  info: LucideIcons.Info,
  plus: LucideIcons.Plus,
  add: LucideIcons.Plus,
  trash: LucideIcons.Trash2,
  delete: LucideIcons.Trash2,
  edit: LucideIcons.Pencil || LucideIcons.Edit,
  refresh: LucideIcons.RefreshCw,
  crown: LucideIcons.Crown,
  vip: LucideIcons.Crown,
  eye: LucideIcons.Eye,
  'eye-off': LucideIcons.EyeOff,
  copy: LucideIcons.Copy,
  'more-vertical': LucideIcons.MoreVertical,
  'more-horizontal': LucideIcons.MoreHorizontal,
  filter: LucideIcons.Filter,
  calendar: LucideIcons.Calendar,
  clock: LucideIcons.Clock,
  'map-pin': LucideIcons.MapPin,
  venue: LucideIcons.MapPin,
  'file-text': LucideIcons.FileText,
  file: LucideIcons.FileText,
  upload: LucideIcons.Upload,
  wifi: LucideIcons.Wifi,
  'wifi-off': LucideIcons.WifiOff,
  play: LucideIcons.Play,
  pause: LucideIcons.Pause,
  minus: LucideIcons.Minus,
  location: LucideIcons.MapPin,
  'check-circle': LucideIcons.CheckCircle || LucideIcons.CircleCheck,
  ticket: LucideIcons.Ticket,
  'clipboard-list': LucideIcons.ClipboardList,
};

const PIXEL_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

/**
 * Normalized Icon primitive.
 * Enforces 1.75–2px stroke, currentColor, normalized sizes,
 * RTL mirroring for directional icons, and aria-hidden handling.
 */
export function Icon({
  name,
  icon: CustomIcon,
  size = 'md',
  strokeWidth = 2,
  mirror = false,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) {
  const Component = CustomIcon || (name ? ICON_MAP[name.toLowerCase()] : null);
  const pxSize = typeof size === 'number' ? size : (PIXEL_SIZES[size] || 20);
  const sizeClass = typeof size === 'string' && styles[size] ? styles[size] : '';
  const isAriaHidden = !ariaLabel;

  const classNames = [
    styles.icon,
    sizeClass,
    mirror ? styles.mirrored : '',
    className,
  ].filter(Boolean).join(' ');

  if (!Component) {
    return null;
  }

  return (
    <span
      className={classNames}
      aria-hidden={isAriaHidden ? 'true' : undefined}
      aria-label={ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      {...props}
    >
      <Component
        size={pxSize}
        strokeWidth={strokeWidth}
        color="currentColor"
        aria-hidden="true"
      />
    </span>
  );
}
