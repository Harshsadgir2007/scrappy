import React, { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../common/StatusBadge';

const LicenseUpload = () => {
  const { company, reloadCompany } = useAuth();
  const { addToast } = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        addToast('Only PDF files are supported for business licenses', 'warning');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        addToast('File size must be under 10MB', 'warning');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select a PDF file first', 'warning');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      await api.post('/companies/me/license', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      addToast('License document uploaded successfully! Status set to pending verification.', 'success');
      setFile(null);
      await reloadCompany();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload license.';
      addToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get('/companies/me/license', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'business_license.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      addToast('Error downloading license document', 'error');
    }
  };

  return (
    <div
      className="scrappy-card"
      style={{
        padding: '24px',
        marginTop: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#142D25' }}>
            verified_user
          </span>
          <h3 style={{ margin: 0, color: '#142D25', fontSize: '16px', fontWeight: 700 }}>
            Business License & Statutory Compliance
          </h3>
        </div>
        <StatusBadge status={company?.verification_status} />
      </div>

      <p style={{ fontSize: '13px', color: '#68756D', lineHeight: 1.5, marginBottom: '20px' }}>
        Upload your industrial factory license, pollution control board (PCB) consent, or GST registration.
        Documents are stored with <strong>Fernet AES-128 symmetric encryption</strong> at rest.
      </p>

      {company?.verification_status === 'verified' && (
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'rgba(184, 227, 106, 0.2)',
            border: '1px solid #B8E36A',
            borderRadius: '8px',
            color: '#142D25',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#142D25', fontSize: '20px' }}>
            check_circle
          </span>
          <div>
            <strong>Verified Enterprise:</strong> Your organization has been authenticated by Scrappy compliance admins.
            You are eligible to post listings and submit variable quantity orders.
          </div>
        </div>
      )}

      {company?.verification_status === 'pending' && (
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#FFF3CD',
            border: '1px solid #FFEBAA',
            borderRadius: '8px',
            color: '#856404',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#856404', fontSize: '20px' }}>
            schedule
          </span>
          <div>
            <strong>Under Review:</strong> Our administrative compliance team is reviewing your uploaded license against
            your declared production capacity.
          </div>
        </div>
      )}

      <form onSubmit={handleUpload} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{
            fontSize: '13px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #E1E6DF',
            backgroundColor: '#F4F4EB',
          }}
        />

        <button
          type="submit"
          disabled={!file || uploading}
          className="btn-primary"
          style={{ fontSize: '13px', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            upload_file
          </span>
          <span>{uploading ? 'Encrypting & Uploading...' : 'Upload License (PDF)'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="btn-secondary"
          style={{ fontSize: '13px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            download
          </span>
          <span>Download Current Document</span>
        </button>
      </form>
    </div>
  );
};

export default LicenseUpload;
