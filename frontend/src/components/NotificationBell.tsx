// NotificationBell component – responsive panel with delete & clear‑all
import React, { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { api } from '../services/api';
import { Notification } from '../types';

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success && res.notifications) setNotifications(res.notifications);
    } catch (e) {
      // silent fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch (e) {
      console.warn('Failed to mark read', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.warn('Failed to delete', e);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllNotifications();
      setNotifications([]);
    } catch (e) {
      console.warn('Failed to clear all', e);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 sm:p-2 text-[#8A94A6] hover:text-[#E7EAEE] hover:bg-[#171B20] border border-transparent hover:border-[#272D34] rounded-xl relative transition-all shrink-0"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#FF6A00] text-black text-[9px] sm:text-[10px] font-black rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,106,0,0.5)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setIsOpen(false)} />

          {/* Responsive Dropdown / Full-width mobile drawer */}
          <div className="fixed sm:absolute inset-x-2 top-16 sm:top-auto sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-96 bg-[#171B20] rounded-2xl shadow-2xl border border-[#272D34] z-50 overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[500px]">
            {/* Header */}
            <div className="p-3.5 bg-[#090B0E] border-b border-[#272D34] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-xs uppercase tracking-wider text-[#E7EAEE]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#FF9A3C] bg-[#FF6A00]/15 border border-[#FF6A00]/30 px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] font-semibold text-[#FF6A00] hover:text-[#FF9A3C] transition-colors px-2 py-0.5 rounded hover:bg-[#272D34]"
                    title="Clear all notifications"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-[#8A94A6] hover:text-[#E7EAEE] rounded-lg"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List with smooth scrolling and horizontal protection */}
            <div className="overflow-y-auto overflow-x-auto divide-y divide-[#272D34] flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-[#8A94A6] text-xs">No notifications yet.</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors min-w-[260px] ${
                      n.read ? 'bg-[#171B20] opacity-75' : 'bg-[#272D34]/35 border-l-2 border-[#FF6A00]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-xs text-[#E7EAEE] break-words">{n.title}</p>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {!n.read && (
                          <button
                            onClick={() => handleMarkRead(n.id)}
                            className="text-[10px] text-[#FF9A3C] hover:text-[#FF6A00] hover:underline flex items-center shrink-0 font-medium bg-[#171B20] border border-[#272D34] px-1.5 py-0.5 rounded"
                            title="Mark read"
                          >
                            <Check className="w-3 h-3 mr-0.5 text-emerald-400" /> Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1 text-[#8A94A6] hover:text-[#FF6A00] hover:bg-[#090B0E] rounded transition-colors"
                          title="Delete notification"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#8A94A6] mt-1 leading-relaxed break-words">{n.message}</p>
                    <span className="text-[10px] text-[#657080] mt-1.5 block">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
