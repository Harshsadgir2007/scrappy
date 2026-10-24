import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const NotificationCenter = ({ inSidebar = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnread = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.unread_count);
    } catch (e) {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=15');
      setNotifications(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: inSidebar ? '100%' : 'auto' }}>
      {inSidebar ? (
        <button
          onClick={toggleDropdown}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
            color: '#E9E9E0',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          title="Cluster Alerts & Notifications"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#B8E36A' }}>
              notifications
            </span>
            <span style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>
              Cluster Alerts
            </span>
          </div>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: '#B8E36A',
              color: '#142D25',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {unreadCount}
          </span>
        </button>
      ) : (
        <button
          onClick={toggleDropdown}
          style={{
            background: 'none',
            border: 'none',
            color: '#252D29',
            cursor: 'pointer',
            padding: '6px 8px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '8px',
          }}
          title="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
            notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#B8E36A',
                color: '#142D25',
                borderRadius: '9999px',
                padding: '1px 5px',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(inSidebar
              ? { bottom: '50px', left: 0, width: '320px' }
              : { top: '48px', right: 0, width: '360px' }),
            maxHeight: '440px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 20px 48px -12px rgba(20, 45, 37, 0.25)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #E1E6DF',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #E1E6DF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#F5F5EC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#142D25' }}>
                notifications
              </span>
              <strong style={{ fontSize: '13px', color: '#142D25', fontWeight: 700 }}>
                Cluster Alerts & Telemetry
              </strong>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: '11px',
                  color: '#142D25',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: '360px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#68756D', fontSize: '13px' }}>
                No active cluster alerts right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.link)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #E1E6DF',
                    backgroundColor: n.is_read ? '#FFFFFF' : 'rgba(184, 227, 106, 0.08)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F5EC')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = n.is_read ? '#FFFFFF' : 'rgba(184, 227, 106, 0.08)')
                  }
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: '#142D25' }}>{n.title}</strong>
                    {!n.is_read && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#B8E36A',
                          border: '1px solid #142D25',
                        }}
                      />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#252D29', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#68756D',
                      marginTop: '6px',
                      display: 'block',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
