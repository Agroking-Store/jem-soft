"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { 
  MoreVertical, 
  Trash2, 
  Check, 
  ExternalLink, 
  Shield, 
  FileText
} from "lucide-react";
import { Notification } from "../types";
import { 
  formatYouTubeTime, 
  getNotificationMeta, 
  getNotificationTargetUrl, 
  getNotificationActionLabel,
  extractPolicyNumber 
} from "../utils/notificationHelpers";

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
  onDelete: (id: string) => void;
  onMarkRead?: (id: string) => void;
}

export default function NotificationCard({
  notification,
  onClick,
  onDelete,
  onMarkRead,
}: NotificationCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { policies } = useSelector((state: RootState) => state.policies);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const policyNumber = extractPolicyNumber(notification.title, notification.message);
  const matchedPolicy = policies?.find(
    (p) =>
      (notification.policyId && p.id === notification.policyId) ||
      (policyNumber && p.policyNumber?.toLowerCase() === policyNumber.toLowerCase())
  );
  const resolvedPolicyId = notification.policyId || matchedPolicy?.id;

  const targetUrl = getNotificationTargetUrl(notification, resolvedPolicyId);
  const actionLabel = getNotificationActionLabel(notification, resolvedPolicyId);

  const handleRowClick = () => {
    if (targetUrl) {
      router.push(targetUrl);
    }
    onClick();
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setMenuOpen(false);
    action();
  };

  const meta = getNotificationMeta(notification.type, notification.title);
  const IconComponent = meta.icon;

  return (
    <div
      onClick={handleRowClick}
      className={`
        group relative flex items-start gap-3.5 px-4 py-3.5 
        cursor-pointer select-none transition-colors duration-150
        border-b border-zinc-100 last:border-b-0
        ${notification.isRead ? "bg-white hover:bg-zinc-50/90" : "bg-blue-50/20 hover:bg-blue-50/40"}
      `}
    >
      {/* YouTube Unread Blue Dot Indicator */}
      <div className="pt-3.5 shrink-0 flex items-center justify-center w-2">
        {!notification.isRead ? (
          <span className="w-1.5 h-1.5 rounded-full bg-[#065fd4] ring-2 ring-blue-100" />
        ) : (
          <span className="w-1.5 h-1.5" />
        )}
      </div>

      {/* Channel / Source Avatar (YouTube Style) */}
      <div className="shrink-0 relative">
        <div
          className={`
            w-11 h-11 rounded-full flex items-center justify-center 
            shadow-xs border border-white
            ${meta.iconBg} ${meta.iconColor}
          `}
        >
          <IconComponent size={20} strokeWidth={2.2} />
        </div>
      </div>

      {/* Main Content Info */}
      <div className="flex-1 min-w-0 pr-1">
        <h4
          className={`
            text-[13.5px] leading-snug line-clamp-2 text-zinc-900 group-hover:text-[#065fd4] transition-colors
            ${notification.isRead ? "font-medium" : "font-bold text-zinc-950"}
          `}
        >
          {notification.title}
        </h4>

        {notification.message && (
          <p className="text-xs text-zinc-600 mt-1 line-clamp-2 leading-relaxed font-normal">
            {notification.message.replace(/\s*\[paymentId:[^\]]+\]/i, "")}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5 text-[11.5px] text-zinc-400 font-normal">
          <span>{formatYouTubeTime(notification.createdAt)}</span>
          {(policyNumber || resolvedPolicyId) && (
            <>
              <span>•</span>
              <span className="text-zinc-500 font-medium truncate max-w-[140px]">
                {policyNumber ? `Policy #${policyNumber}` : `Policy #${resolvedPolicyId?.slice(-6)}`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Column: YouTube 16:9 Thumbnail Preview */}
      <div className="shrink-0 hidden xs:flex flex-col items-center justify-center">
        <div className="w-16 h-10 rounded-md bg-gradient-to-br from-zinc-100 to-zinc-200 border border-zinc-200/80 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs group-hover:border-zinc-300 transition-colors">
          <IconComponent size={16} className={meta.iconColor} />
          <div className={`absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded text-[9px] font-bold leading-tight uppercase ${meta.badgeBg} ${meta.badgeColor}`}>
            {meta.badgeLabel}
          </div>
        </div>
      </div>

      {/* Right Column: YouTube 3-Dots Action Button & Dropdown Menu */}
      <div className="shrink-0 relative pt-1" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          title="Notification options"
          className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/70 transition-colors opacity-70 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
        >
          <MoreVertical size={17} />
        </button>

        {menuOpen && (
          <div
            className="
              absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-zinc-200/90 
              py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left
            "
          >
            {!notification.isRead && (
              <button
                type="button"
                onClick={(e) =>
                  handleAction(e, () => {
                    if (onMarkRead) onMarkRead(notification.id);
                    else onClick();
                  })
                }
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <Check size={15} className="text-[#065fd4]" />
                Mark as read
              </button>
            )}

            {targetUrl && (
              <button
                type="button"
                onClick={(e) =>
                  handleAction(e, () => {
                    router.push(targetUrl);
                    onClick();
                  })
                }
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <ExternalLink size={15} className="text-zinc-500" />
                {actionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={(e) => handleAction(e, () => onDelete(notification.id))}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
              Delete notification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}