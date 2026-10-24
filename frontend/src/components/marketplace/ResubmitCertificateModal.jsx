import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';

const ResubmitCertificateModal = ({ isOpen, onClose, listing, onResubmitted }) => {
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [measuredParams, setMeasuredParams] = useState({});

  const [formData, setFormData] = useState({
    test_name: 'Revised Quality & Assay Test',
    testing_lab_name: '',
    certificate_number: '',
    test_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    lab_accreditation: 'NABL / ISO 17025 Certified',
    overall_grade_or_result: 'Pass / Industrial Conformance',
  });

  useEffect(() => {
    if (isOpen && listing) {
      // Fetch requirements for category
      const cat = listing.material_category || listing.category;
      if (cat) {
        api
          .get('/quality/requirements', { params: { category: cat } })
          .then((res) => {
            setRequirements(res.data);
            const initParams = {};
            res.data.forEach((r) => {
              if (r.min_value !== null && r.min_value !== undefined) {
                initParams[r.parameter_key] = r.min_value;
              }
            });
            setMeasuredParams(initParams);
          })
          .catch(() => {});
      }

      // Pre-fill existing certificate data if present
      if (listing.quality_certificate) {
        setFormData({
          test_name: 'Revised Quality & Assay Test',
          testing_lab_name: listing.quality_certificate.testing_lab_name || '',
          certificate_number: listing.quality_certificate.certificate_number || '',
          test_date: new Date().toISOString().split('T')[0],
          expiry_date: '',
          lab_accreditation: listing.quality_certificate.lab_accreditation || 'NABL / ISO 17025 Certified',
          overall_grade_or_result: 'Pass / Industrial Conformance',
        });
      }
    }
  }, [isOpen, listing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + selected.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      addToast('Invalid file format. Upload certified PDF, PNG, or JPG document.', 'error');
      e.target.value = '';
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      addToast('Document exceeds 15MB limit.', 'error');
      e.target.value = '';
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!listing) return;

    if (!file) {
      addToast('Please attach the corrected test certificate / lab report file.', 'warning');
      return;
    }

    if (!formData.testing_lab_name.trim()) {
      addToast('Please specify the accredited testing laboratory.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('file', file);
      const metaObj = {
        test_name: formData.test_name || 'Revised Quality & Assay Test',
        testing_lab_name: formData.testing_lab_name,
        certificate_number: formData.certificate_number || `QC-${Date.now()}`,
        test_date: formData.test_date,
        expiry_date: formData.expiry_date || null,
        lab_accreditation: formData.lab_accreditation,
        overall_grade_or_result: formData.overall_grade_or_result,
        parameters_data: measuredParams,
      };
      fd.append('metadata', JSON.stringify(metaObj));
      fd.append('test_name', metaObj.test_name);
      fd.append('testing_lab_name', metaObj.testing_lab_name);
      fd.append('certificate_number', metaObj.certificate_number);
      fd.append('test_date', metaObj.test_date);
      if (metaObj.expiry_date) {
        fd.append('expiry_date', metaObj.expiry_date);
      }
      fd.append('lab_accreditation', metaObj.lab_accreditation);
      fd.append('overall_grade_or_result', metaObj.overall_grade_or_result);
      fd.append('measured_parameters', JSON.stringify(measuredParams));

      await api.post(`/quality/listings/${listing.id}/certificate`, fd);

      addToast('Replacement certificate uploaded! Listing moved to Pending Review.', 'success');
      if (onResubmitted) onResubmitted();
      onClose();
    } catch (err) {
      let errMsg = 'Failed to resubmit certificate';
      if (err.response?.data?.detail) {
        const d = err.response.data.detail;
        if (typeof d === 'string') errMsg = d;
        else if (Array.isArray(d)) errMsg = d.map((x) => x.msg || JSON.stringify(x)).join(', ');
        else errMsg = d.msg || JSON.stringify(d);
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message) {
        errMsg = err.message;
      }
      addToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resubmit Material Quality Certificate — Listing #${listing?.id}`}
      maxWidth="640px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {listing?.quality_certificate?.reviewer_comments && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              padding: '12px 14px',
              borderRadius: '8px',
            }}
          >
            <strong style={{ color: '#991B1B', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
              Previous Reviewer Feedback:
            </strong>
            <p style={{ margin: 0, color: '#7F1D1D', fontSize: '12px' }}>
              {listing.quality_certificate.reviewer_comments}
            </p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              Testing Laboratory / Organization *
            </label>
            <input
              type="text"
              name="testing_lab_name"
              value={formData.testing_lab_name}
              onChange={handleChange}
              placeholder="e.g. National Test House / NABL Lab"
              required
              className="scrappy-input"
              style={{ fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              Certificate / Report Ref No.
            </label>
            <input
              type="text"
              name="certificate_number"
              value={formData.certificate_number}
              onChange={handleChange}
              placeholder="e.g. NTH/WR/REV/2026/01"
              className="scrappy-input"
              style={{ fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              Test Date *
            </label>
            <input
              type="date"
              name="test_date"
              value={formData.test_date}
              onChange={handleChange}
              required
              className="scrappy-input"
              style={{ fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
              Accreditation Standard
            </label>
            <input
              type="text"
              name="lab_accreditation"
              value={formData.lab_accreditation}
              onChange={handleChange}
              className="scrappy-input"
              style={{ fontSize: '12px' }}
            />
          </div>
        </div>

        {requirements.length > 0 && (
          <div style={{ backgroundColor: '#F8FBF8', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D8E2DC' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1B4332', display: 'block', marginBottom: '6px' }}>
              Updated Quality Assay Parameters:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
              {requirements.map((req) => (
                <div key={req.id}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#444' }}>
                    {req.parameter_label} {req.parameter_unit && `(${req.parameter_unit})`}
                  </label>
                  <input
                    type={req.data_type === 'number' ? 'number' : 'text'}
                    step="0.01"
                    value={measuredParams[req.parameter_key] || ''}
                    onChange={(e) =>
                      setMeasuredParams((prev) => ({ ...prev, [req.parameter_key]: e.target.value }))
                    }
                    className="scrappy-input"
                    style={{ fontSize: '12px', padding: '4px 6px' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#1B4332' }}>
            Replacement Document (PDF, PNG, JPG &bull; Max 15MB) *
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
            required
            className="scrappy-input"
            style={{ fontSize: '12px' }}
          />
          {file && (
            <span style={{ fontSize: '11px', color: '#2D6A4F', marginTop: '4px', display: 'block' }}>
              ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: '8px 20px' }}
          >
            {submitting ? 'Uploading & Encrypting...' : 'Upload & Resubmit For Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ResubmitCertificateModal;
