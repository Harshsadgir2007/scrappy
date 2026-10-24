import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return {
          bg: '#142D25',
          color: '#FAFBF7',
          dot: '#B8E36A',
          icon: 'verified',
          label: 'Verified Enterprise',
        };
      case 'pending':
        return {
          bg: '#FFF3CD',
          color: '#856404',
          dot: '#F77F00',
          icon: 'schedule',
          label: 'Pending Verification',
        };
      case 'rejected':
        return {
          bg: '#FFDAD6',
          color: '#93000A',
          dot: '#BA1A1A',
          icon: 'cancel',
          label: 'Rejected',
        };
      case 'suspended':
        return {
          bg: '#EEEEE5',
          color: '#68756D',
          dot: '#727975',
          icon: 'pause_circle',
          label: 'Suspended',
        };
      default:
        return {
          bg: '#EEEEE5',
          color: '#68756D',
          dot: '#727975',
          icon: 'info',
          label: status || 'Unknown',
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: badge.bg,
        color: badge.color,
        letterSpacing: '0.04em',
        fontFamily: 'JetBrains Mono, monospace',
        textTransform: 'uppercase',
      }}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: '13px', color: badge.dot }}
      >
        {badge.icon}
      </span>
      {badge.label}
    </span>
  );
};

export default StatusBadge;
