import React, { useState } from 'react';
import VerificationQueue from '../components/admin/VerificationQueue';
import QualityCertificatesManager from '../components/admin/QualityCertificatesManager';

const AdminVerificationPage = () => {
  const [activeSection, setActiveSection] = useState('quality'); // 'companies' or 'quality'

  return (
    <div style={{ paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Navigation Switcher */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #E1E6DF', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveSection('quality')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: activeSection === 'quality' ? '#142D25' : '#E9E9E0',
            color: activeSection === 'quality' ? '#FAFBF7' : '#4A5550',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            verified
          </span>
          Material Quality Certification & Testing Requirements
        </button>
        <button
          onClick={() => setActiveSection('companies')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: activeSection === 'companies' ? '#142D25' : '#E9E9E0',
            color: activeSection === 'companies' ? '#FAFBF7' : '#4A5550',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            corporate_fare
          </span>
          Company License Verification Queue
        </button>
      </div>

      {activeSection === 'quality' ? <QualityCertificatesManager /> : <VerificationQueue />}
    </div>
  );
};

export default AdminVerificationPage;
