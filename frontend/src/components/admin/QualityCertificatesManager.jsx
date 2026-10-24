import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';

const QualityCertificatesManager = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'requirements'

  // Queue state
  const [certificates, setCertificates] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [selectedCert, setSelectedCert] = useState(null);
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewComments, setReviewComments] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Requirements state
  const [requirements, setRequirements] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [reqFormData, setReqFormData] = useState({
    material_category: 'metal',
    test_name: '',
    parameter_key: '',
    parameter_label: '',
    parameter_unit: '',
    data_type: 'number',
    is_mandatory: true,
    min_value: '',
    max_value: '',
    standard_code: '',
    description: '',
  });

  const fetchCertificates = useCallback(async () => {
    try {
      setLoadingCerts(true);
      const url = statusFilter === 'all' ? '/quality/review-queue' : `/quality/review-queue?status_filter=${statusFilter}`;
      const res = await api.get(url);
      setCertificates(res.data || []);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to load certificate review queue', 'error');
    } finally {
      setLoadingCerts(false);
    }
  }, [statusFilter, addToast]);

  const fetchRequirements = useCallback(async () => {
    try {
      setLoadingReqs(true);
      const url = selectedCategory === 'all' ? '/quality/requirements' : `/quality/requirements?category=${selectedCategory}`;
      const res = await api.get(url);
      setRequirements(res.data || []);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to load quality testing requirements', 'error');
    } finally {
      setLoadingReqs(false);
    }
  }, [selectedCategory, addToast]);

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchCertificates();
    } else {
      fetchRequirements();
    }
  }, [activeTab, fetchCertificates, fetchRequirements]);

  const handleDownloadDoc = async (cert) => {
    try {
      const res = await api.get(`/quality/certificates/${cert.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: cert.mime_type || 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', cert.original_filename || `cert_${cert.certificate_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Certificate document decrypted and downloaded.', 'success');
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to download certificate document', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCert) return;

    if (reviewAction === 'reject' && !reviewComments.trim()) {
      addToast('Please provide a specific rejection reason for the enterprise.', 'warning');
      return;
    }

    try {
      setSubmittingReview(true);
      await api.put(`/quality/certificates/${selectedCert.id}/review`, {
        action: reviewAction,
        comments: reviewComments,
      });

      addToast(`Certificate #${selectedCert.certificate_number} marked as ${reviewAction.toUpperCase()}!`, 'success');
      setSelectedCert(null);
      setReviewComments('');
      await fetchCertificates();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit review action', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCreateRequirement = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        material_category: reqFormData.material_category,
        test_name: reqFormData.test_name,
        parameter_key: reqFormData.parameter_key.trim().toLowerCase().replace(/\s+/g, '_'),
        parameter_label: reqFormData.parameter_label,
        parameter_unit: reqFormData.parameter_unit || null,
        data_type: reqFormData.data_type,
        is_mandatory: reqFormData.is_mandatory,
        min_value: reqFormData.min_value ? parseFloat(reqFormData.min_value) : null,
        max_value: reqFormData.max_value ? parseFloat(reqFormData.max_value) : null,
        standard_code: reqFormData.standard_code || null,
        description: reqFormData.description || null,
      };

      await api.post('/quality/requirements', payload);
      addToast('New material testing requirement created!', 'success');
      setIsReqModalOpen(false);
      setReqFormData({
        material_category: 'metal',
        test_name: '',
        parameter_key: '',
        parameter_label: '',
        parameter_unit: '',
        data_type: 'number',
        is_mandatory: true,
        min_value: '',
        max_value: '',
        standard_code: '',
        description: '',
      });
      await fetchRequirements();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create requirement', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Subheader / Tabs ────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E1E6DF', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('queue')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              backgroundColor: activeTab === 'queue' ? '#142D25' : '#E9E9E0',
              color: activeTab === 'queue' ? '#FAFBF7' : '#4A5550',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              fact_check
            </span>
            Certificate Review Queue
          </button>
          <button
            onClick={() => setActiveTab('requirements')}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '14px',
              backgroundColor: activeTab === 'requirements' ? '#142D25' : '#E9E9E0',
              color: activeTab === 'requirements' ? '#FAFBF7' : '#4A5550',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              settings_suggest
            </span>
            Testing Requirements Manager
          </button>
        </div>

        {activeTab === 'requirements' && (
          <button
            onClick={() => setIsReqModalOpen(true)}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#B8E36A',
              color: '#142D25',
              fontWeight: 700,
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add_circle
            </span>
            Add Testing Parameter
          </button>
        )}
      </div>

      {/* ── TAB 1: CERTIFICATE REVIEW QUEUE ──────────────────────────── */}
      {activeTab === 'queue' && (
        <section className="scrappy-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#142D25' }}>
                Material Quality Certificate Submissions
              </h2>
              <p style={{ margin: '4px 0 0', color: '#68756D', fontSize: '13px' }}>
                Review laboratory test certificates and test parameter values before approving listings for public trading.
              </p>
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F4F0', padding: '4px', borderRadius: '8px' }}>
              {['pending_review', 'approved', 'rejected', 'all'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: statusFilter === filter ? 700 : 500,
                    backgroundColor: statusFilter === filter ? '#FFFFFF' : 'transparent',
                    color: statusFilter === filter ? '#142D25' : '#68756D',
                    boxShadow: statusFilter === filter ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {filter.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loadingCerts ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <LoadingSpinner />
            </div>
          ) : certificates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#68756D' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#CBD5E1' }}>
                task_alt
              </span>
              <p style={{ marginTop: '8px', fontSize: '14px' }}>No certificates currently in this review queue.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {certificates.map((cert) => {
                const params = cert.parameters_data || {};
                return (
                  <div
                    key={cert.id}
                    style={{
                      border: '1px solid #E1E6DF',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#E2E8F0',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {cert.material_category}
                          </span>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#142D25' }}>
                            {cert.test_name}
                          </h3>
                        </div>
                        <div style={{ fontSize: '13px', color: '#4A5550' }}>
                          Report No: <strong>{cert.certificate_number}</strong> | Lab: <strong>{cert.testing_lab_name}</strong>
                          {cert.lab_accreditation && ` (${cert.lab_accreditation})`}
                        </div>
                        <div style={{ fontSize: '12px', color: '#68756D', marginTop: '4px' }}>
                          Test Date: {new Date(cert.test_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} |
                          Listing ID: #{cert.listing_id} | Company ID: #{cert.company_id}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {cert.review_status === 'approved' ? (
                          <span className="pill pill-lime" style={{ fontSize: '12px', fontWeight: 700 }}>
                            ✓ Approved
                          </span>
                        ) : cert.review_status === 'rejected' ? (
                          <span className="pill" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '12px', fontWeight: 700 }}>
                            ✕ Rejected
                          </span>
                        ) : (
                          <span className="pill pill-neutral" style={{ fontSize: '12px', fontWeight: 700 }}>
                            ⏳ Pending Review
                          </span>
                        )}

                        <button
                          onClick={() => handleDownloadDoc(cert)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#F8FAF7',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#142D25',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                            download
                          </span>
                          Download Document
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCert(cert);
                            setReviewAction('approve');
                            setReviewComments('');
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#142D25',
                            color: '#FAFBF7',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          Review & Decide
                        </button>
                      </div>
                    </div>

                    {/* Measured Parameter Chips */}
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #E1E6DF' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
                        Measured Test Parameters & Assays:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                        {Object.keys(params).length === 0 ? (
                          <span style={{ fontSize: '12px', color: '#94A3B8' }}>No parameter payload attached</span>
                        ) : (
                          Object.entries(params).map(([key, val]) => (
                            <span
                              key={key}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#F1F4F0',
                                border: '1px solid #E1E6DF',
                                fontSize: '12px',
                                fontFamily: 'JetBrains Mono, monospace',
                                color: '#142D25',
                              }}
                            >
                              <strong>{key}:</strong> {val}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Review comments if present */}
                    {cert.reviewer_comments && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', backgroundColor: cert.review_status === 'rejected' ? '#FEF2F2' : '#F0FDF4', fontSize: '12px' }}>
                        <strong>Reviewer Feedback:</strong> {cert.reviewer_comments}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── TAB 2: TESTING REQUIREMENTS MANAGER ───────────────────────── */}
      {activeTab === 'requirements' && (
        <section className="scrappy-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#142D25' }}>
                Configurable Quality Testing Requirements
              </h2>
              <p style={{ margin: '4px 0 0', color: '#68756D', fontSize: '13px' }}>
                Define mandatory and optional parameters required before companies can publish listings in each material category.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '6px', backgroundColor: '#F1F4F0', padding: '4px', borderRadius: '8px' }}>
              {['all', 'metal', 'textile', 'chemical'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: selectedCategory === cat ? 700 : 500,
                    backgroundColor: selectedCategory === cat ? '#FFFFFF' : 'transparent',
                    color: selectedCategory === cat ? '#142D25' : '#68756D',
                    boxShadow: selectedCategory === cat ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loadingReqs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <LoadingSpinner />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E1E6DF', backgroundColor: '#F8FAF7' }}>
                    <th style={{ padding: '12px 14px', color: '#4A5550' }}>Category</th>
                    <th style={{ padding: '12px 14px', color: '#4A5550' }}>Parameter</th>
                    <th style={{ padding: '12px 14px', color: '#4A5550' }}>Key / Unit</th>
                    <th style={{ padding: '12px 14px', color: '#4A5550' }}>Mandatory?</th>
                    <th style={{ padding: '12px 14px', color: '#4A5550' }}>Allowed Limits</th>
                    <th style={{ padding: '12px 14px', color: '#4A5550' }}>Standard Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #F1F4F0' }}>
                      <td style={{ padding: '12px 14px', textTransform: 'capitalize', fontWeight: 600 }}>
                        {req.material_category || 'General'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#142D25' }}>
                        <strong>{req.parameter_label}</strong>
                        <div style={{ fontSize: '11px', color: '#68756D' }}>{req.test_name}</div>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                        {req.parameter_key} {req.parameter_unit && `(${req.parameter_unit})`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {req.is_mandatory ? (
                          <span className="pill pill-lime" style={{ fontSize: '11px', fontWeight: 700 }}>
                            Mandatory
                          </span>
                        ) : (
                          <span className="pill pill-neutral" style={{ fontSize: '11px' }}>
                            Optional
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                        {req.min_value !== null ? req.min_value : '—'} to {req.max_value !== null ? req.max_value : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#68756D' }}>
                        {req.standard_code || 'National Standard'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Review Decision Modal ─────────────────────────────────────── */}
      <Modal isOpen={!!selectedCert} onClose={() => setSelectedCert(null)} title="Quality Certificate Review Decision">
        {selectedCert && (
          <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: '#F8FAF7', padding: '14px', borderRadius: '6px', fontSize: '13px' }}>
              <div><strong>Listing:</strong> #{selectedCert.listing_id} ({selectedCert.material_category.toUpperCase()})</div>
              <div><strong>Lab:</strong> {selectedCert.testing_lab_name}</div>
              <div><strong>Report Reference:</strong> {selectedCert.certificate_number}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Review Decision
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="approve"
                    checked={reviewAction === 'approve'}
                    onChange={() => setReviewAction('approve')}
                  />
                  <span style={{ color: '#2E7D32', fontWeight: 700 }}>Approve Certificate</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="reject"
                    checked={reviewAction === 'reject'}
                    onChange={() => setReviewAction('reject')}
                  />
                  <span style={{ color: '#C62828', fontWeight: 700 }}>Reject with Feedback</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="decision"
                    value="info_required"
                    checked={reviewAction === 'info_required'}
                    onChange={() => setReviewAction('info_required')}
                  />
                  <span style={{ color: '#D97706', fontWeight: 700 }}>Request More Info</span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                Reviewer Comments & Feedback {reviewAction === 'reject' && <span style={{ color: '#DC2626' }}>* (Required)</span>}
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
                required={reviewAction === 'reject'}
                placeholder={reviewAction === 'reject' ? 'State clear reasons for rejection (e.g., parameter out of tolerance, unverified lab accreditation)' : 'Add notes on testing laboratory verification or compliance findings...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedCert(null)}
                disabled={submittingReview}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingReview}
                style={{
                  backgroundColor: reviewAction === 'reject' ? '#DC2626' : '#142D25',
                  color: '#FAFBF7',
                  fontWeight: 700,
                }}
              >
                {submittingReview ? 'Submitting Decision...' : `Confirm ${reviewAction.toUpperCase()}`}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Add Parameter Requirement Modal ───────────────────────────── */}
      <Modal isOpen={isReqModalOpen} onClose={() => setIsReqModalOpen(false)} title="Configure Quality Testing Parameter">
        <form onSubmit={handleCreateRequirement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Material Category</label>
              <select
                value={reqFormData.material_category}
                onChange={(e) => setReqFormData({ ...reqFormData, material_category: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              >
                <option value="metal">Metal Scrap</option>
                <option value="textile">Textile Waste</option>
                <option value="chemical">Fly Ash / Chemical</option>
                <option value="general">General Recyclable</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Test Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Chemical Assay / Purity"
                value={reqFormData.test_name}
                onChange={(e) => setReqFormData({ ...reqFormData, test_name: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Parameter Label</label>
              <input
                type="text"
                required
                placeholder="e.g. Lead Content (%)"
                value={reqFormData.parameter_label}
                onChange={(e) => setReqFormData({ ...reqFormData, parameter_label: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Parameter Key (Internal)</label>
              <input
                type="text"
                required
                placeholder="e.g. lead_content_pct"
                value={reqFormData.parameter_key}
                onChange={(e) => setReqFormData({ ...reqFormData, parameter_key: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Unit</label>
              <input
                type="text"
                placeholder="%, ppm, m2/kg"
                value={reqFormData.parameter_unit}
                onChange={(e) => setReqFormData({ ...reqFormData, parameter_unit: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Min Allowed</label>
              <input
                type="number"
                step="any"
                value={reqFormData.min_value}
                onChange={(e) => setReqFormData({ ...reqFormData, min_value: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Max Allowed</label>
              <input
                type="number"
                step="any"
                value={reqFormData.max_value}
                onChange={(e) => setReqFormData({ ...reqFormData, max_value: e.target.value })}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <input
              type="checkbox"
              id="isMand"
              checked={reqFormData.is_mandatory}
              onChange={(e) => setReqFormData({ ...reqFormData, is_mandatory: e.target.checked })}
            />
            <label htmlFor="isMand" style={{ fontWeight: 600, cursor: 'pointer' }}>
              Mandatory Parameter (Company must submit before listing can be published)
            </label>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Standard Code Reference</label>
            <input
              type="text"
              placeholder="e.g. IS 2062:2011 / ASTM D629"
              value={reqFormData.standard_code}
              onChange={(e) => setReqFormData({ ...reqFormData, standard_code: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsReqModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#142D25', color: '#FAFBF7', fontWeight: 700 }}>
              Save Requirement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default QualityCertificatesManager;
