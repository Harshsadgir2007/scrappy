import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';

const CreateListingModal = ({ isOpen, onClose, onCreated }) => {
  const { company } = useAuth();
  const { addToast } = useToast();
  const [materials, setMaterials] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Quality requirements state
  const [qualityRequirements, setQualityRequirements] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  // Quality certificate form state
  const [certFile, setCertFile] = useState(null);
  const [certData, setCertData] = useState({
    test_name: '',
    testing_lab_name: '',
    certificate_number: '',
    test_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    lab_accreditation: 'NABL / ISO 17025 Certified',
    overall_grade_or_result: 'Pass / Industrial Grade',
  });
  const [measuredParams, setMeasuredParams] = useState({});

  const [formData, setFormData] = useState({
    material_id: '',
    category: 'scrap',
    title: '',
    description: '',
    total_tons: '',
    price_per_ton: '',
    min_price_floor: '',
    min_order_tons: '5.0',
    is_processed: false,
    processing_details: '',
    processing_cost_per_ton: '0.0',
    pickup_address: company?.address || '',
    pickup_city: company?.city || '',
    pickup_state: company?.state || '',
    pickup_pincode: company?.pincode || '',
    is_coming_soon: false,
    expected_available_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      api.get('/materials').then((res) => setMaterials(res.data)).catch(() => {});
      if (company) {
        setFormData((prev) => ({
          ...prev,
          pickup_address: company.address || '',
          pickup_city: company.city || '',
          pickup_state: company.state || '',
          pickup_pincode: company.pincode || '',
        }));
      }
    }
  }, [isOpen, company]);

  // Fetch quality requirements when material or category changes
  useEffect(() => {
    if (!isOpen) return;
    const selectedMat = materials.find((m) => m.id === parseInt(formData.material_id));
    const cat = selectedMat ? selectedMat.category : formData.category;

    if (cat) {
      setLoadingReqs(true);
      api
        .get('/quality/requirements', { params: { category: cat } })
        .then((res) => {
          setQualityRequirements(res.data);
          // Pre-populate default parameter keys
          const initialParams = {};
          res.data.forEach((r) => {
            if (r.min_value !== null && r.min_value !== undefined) {
              initialParams[r.parameter_key] = r.min_value;
            }
          });
          setMeasuredParams(initialParams);
          if (res.data.length > 0 && !certData.test_name) {
            setCertData((prev) => ({ ...prev, test_name: res.data[0].test_name }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReqs(false));
    }
  }, [formData.material_id, formData.category, materials, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCertChange = (e) => {
    const { name, value } = e.target;
    setCertData((prev) => ({ ...prev, [name]: value }));
  };

  const handleParamChange = (key, val) => {
    setMeasuredParams((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      addToast('Invalid file format. Upload certified PDF, PNG, or JPG document.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      addToast('Document exceeds 15MB limit. Please upload a compressed document.', 'error');
      e.target.value = '';
      return;
    }

    setCertFile(file);
  };

  const handleMaterialSelect = (e) => {
    const matId = e.target.value;
    const selected = materials.find((m) => m.id === parseInt(matId));
    setFormData((prev) => ({
      ...prev,
      material_id: matId,
      title: selected ? `${selected.name} (${selected.category.toUpperCase()})` : prev.title,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.material_id) {
      addToast('Please select a material type from the master catalog', 'warning');
      return;
    }
    const price = parseFloat(formData.price_per_ton);
    const floor = parseFloat(formData.min_price_floor);

    if (price < floor) {
      addToast('Price per ton cannot be lower than your declared minimum price floor', 'warning');
      return;
    }

    // Quality test certification is mandatory
    if (!certFile) {
      addToast('Mandatory Material Quality Test Certificate is required before publishing.', 'warning');
      return;
    }
    if (!certData.testing_lab_name.trim()) {
      addToast('Please specify the accredited testing laboratory name.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        material_id: parseInt(formData.material_id),
        category: formData.category,
        title: formData.title,
        description: formData.description,
        total_tons: parseFloat(formData.total_tons),
        price_per_ton: price,
        min_price_floor: floor,
        min_order_tons: parseFloat(formData.min_order_tons) || 1.0,
        is_processed: formData.is_processed,
        processing_details: formData.is_processed ? formData.processing_details : null,
        processing_cost_per_ton: formData.is_processed ? parseFloat(formData.processing_cost_per_ton) : 0.0,
        pickup_address: formData.pickup_address,
        pickup_city: formData.pickup_city,
        pickup_state: formData.pickup_state,
        pickup_pincode: formData.pickup_pincode,
        is_coming_soon: formData.is_coming_soon,
        expected_available_date:
          formData.is_coming_soon && formData.expected_available_date
            ? new Date(formData.expected_available_date).toISOString()
            : null,
      };

      // 1. Create listing
      const listingRes = await api.post('/listings', payload);
      const listingId = listingRes.data.id;

      // 2. Upload mandatory quality certificate
      const certFormData = new FormData();
      certFormData.append('file', certFile);
      const metaObj = {
        test_name: certData.test_name || 'Standard Quality & Assay Test',
        testing_lab_name: certData.testing_lab_name || 'Accredited Material Testing Facility',
        certificate_number: certData.certificate_number || `QC-${Date.now()}`,
        test_date: certData.test_date || new Date().toISOString().split('T')[0],
        expiry_date: certData.expiry_date || null,
        lab_accreditation: certData.lab_accreditation || 'NABL / ISO 17025 Certified',
        overall_grade_or_result: certData.overall_grade_or_result || 'Pass / Industrial Conformance',
        parameters_data: measuredParams,
      };
      certFormData.append('metadata', JSON.stringify(metaObj));
      certFormData.append('test_name', metaObj.test_name);
      certFormData.append('testing_lab_name', metaObj.testing_lab_name);
      certFormData.append('certificate_number', metaObj.certificate_number);
      certFormData.append('test_date', metaObj.test_date);
      if (metaObj.expiry_date) {
        certFormData.append('expiry_date', metaObj.expiry_date);
      }
      certFormData.append('lab_accreditation', metaObj.lab_accreditation);
      certFormData.append('overall_grade_or_result', metaObj.overall_grade_or_result);
      certFormData.append('measured_parameters', JSON.stringify(measuredParams));

      await api.post(`/quality/listings/${listingId}/certificate`, certFormData);

      addToast(
        'Listing created! Quality certificate submitted and marked Pending Review for platform compliance.',
        'success'
      );
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      let errMsg = 'Failed to create listing and certificate';
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
      title="Publish Industrial Scrap / By-Product Listing"
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Standard Material from Taxonomy *
            </label>
            <select
              name="material_id"
              value={formData.material_id}
              onChange={handleMaterialSelect}
              required
              className="scrappy-select"
            >
              <option value="">-- Choose Standard Taxonomy --</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.category.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Waste Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="scrappy-select"
            >
              <option value="scrap">Production Scrap</option>
              <option value="by_product">Industrial By-Product</option>
              <option value="leftover">Unused Raw Material Leftover</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
            Listing Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Mild Steel Sheet Scrap Off-cuts (6mm+)"
            required
            className="scrappy-input"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
            Description, Metallurgical Composition & Specs
          </label>
          <textarea
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            placeholder="Physical condition, dimensions, Fe content %, moisture, contaminants..."
            className="scrappy-textarea"
          />
        </div>

        {/* Quantities & Pricing */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Total Lot Quantity (MT) *
            </label>
            <input
              type="number"
              step="0.5"
              name="total_tons"
              value={formData.total_tons}
              onChange={handleChange}
              placeholder="e.g. 100"
              required
              className="scrappy-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Asking Price (₹ / MT) *
            </label>
            <input
              type="number"
              step="100"
              name="price_per_ton"
              value={formData.price_per_ton}
              onChange={handleChange}
              placeholder="e.g. 36000"
              required
              className="scrappy-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Floor Price Floor (₹ / MT) *
            </label>
            <input
              type="number"
              step="100"
              name="min_price_floor"
              value={formData.min_price_floor}
              onChange={handleChange}
              placeholder="e.g. 34000"
              required
              className="scrappy-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Min Partial Order (MT) *
            </label>
            <input
              type="number"
              step="0.5"
              name="min_order_tons"
              value={formData.min_order_tons}
              onChange={handleChange}
              placeholder="e.g. 5.0"
              required
              className="scrappy-input"
            />
          </div>
        </div>

        {/* ── MANDATORY MATERIAL QUALITY TEST CERTIFICATE ────────────────────── */}
        <div
          style={{
            backgroundColor: '#F8FBF8',
            border: '2px solid #52B788',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2D6A4F', fontSize: '22px' }}>
                verified_user
              </span>
              <strong style={{ color: '#1B4332', fontSize: '14px' }}>
                Mandatory Material Quality Test Certificate
              </strong>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#2D6A4F',
                backgroundColor: '#E8F5E9',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              Required for Compliance
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>
            Before publishing, submit an accredited laboratory test report or assay certificate. Uploaded documents are
            encrypted with AES-128 and reviewed before public marketplace visibility.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                Testing Laboratory / Organization *
              </label>
              <input
                type="text"
                name="testing_lab_name"
                value={certData.testing_lab_name}
                onChange={handleCertChange}
                placeholder="e.g. National Test House / SGS India"
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
                value={certData.certificate_number}
                onChange={handleCertChange}
                placeholder="e.g. NTH/WR/MET/2026/0892"
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
                value={certData.test_date}
                onChange={handleCertChange}
                required
                className="scrappy-input"
                style={{ fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
                Overall Grade / Result
              </label>
              <input
                type="text"
                name="overall_grade_or_result"
                value={certData.overall_grade_or_result}
                onChange={handleCertChange}
                placeholder="e.g. Furnace Grade Heavy Melting"
                className="scrappy-input"
                style={{ fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Dynamic Category Parameters based on backend configuration */}
          {qualityRequirements.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #D8E2DC' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1B4332', display: 'block', marginBottom: '8px' }}>
                Required Quality Parameters for Category ({qualityRequirements[0]?.material_category?.toUpperCase()}):
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {qualityRequirements.map((req) => (
                  <div key={req.id}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#333', marginBottom: '2px' }}>
                      {req.parameter_label} {req.is_mandatory && <span style={{ color: '#E63946' }}>*</span>}
                      {req.parameter_unit && <span style={{ color: '#777' }}> ({req.parameter_unit})</span>}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type={req.data_type === 'number' ? 'number' : 'text'}
                        step="0.01"
                        value={measuredParams[req.parameter_key] || ''}
                        onChange={(e) => handleParamChange(req.parameter_key, e.target.value)}
                        placeholder={`e.g. ${req.min_value || 0}`}
                        className="scrappy-input"
                        style={{ fontSize: '12px', padding: '6px 8px' }}
                      />
                    </div>
                    {req.standard_code && (
                      <span style={{ fontSize: '9px', color: '#888', display: 'block', marginTop: '2px' }}>
                        Standard: {req.standard_code}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certificate File Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#1B4332' }}>
              Upload Test Certificate / Lab Report (PDF, JPG, PNG &bull; Max 15MB) *
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              required
              className="scrappy-input"
              style={{ fontSize: '12px' }}
            />
            {certFile && (
              <span style={{ fontSize: '11px', color: '#2D6A4F', marginTop: '4px', display: 'block' }}>
                ✓ Selected: {certFile.name} ({(certFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        </div>

        {/* Processing Declaration */}
        <div
          style={{
            padding: '14px',
            backgroundColor: '#F4F4EB',
            borderRadius: '8px',
            border: '1px solid #E1E6DF',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
            <input
              type="checkbox"
              name="is_processed"
              checked={formData.is_processed}
              onChange={handleChange}
            />
            Has this material undergone pre-processing, sorting, or chemical treatment?
          </label>

          {formData.is_processed && (
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  Processing Details & Treatment Type
                </label>
                <input
                  type="text"
                  name="processing_details"
                  value={formData.processing_details}
                  onChange={handleChange}
                  placeholder="e.g. Shredded, magnetic de-stoning, baled"
                  className="scrappy-input"
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                  Treatment Surcharge (₹/MT)
                </label>
                <input
                  type="number"
                  name="processing_cost_per_ton"
                  value={formData.processing_cost_per_ton}
                  onChange={handleChange}
                  className="scrappy-input"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pre-Book / Futures Option */}
        <div
          style={{
            padding: '14px',
            backgroundColor: '#F4F4EB',
            borderRadius: '8px',
            border: '1px solid #E1E6DF',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px' }}>
            <input
              type="checkbox"
              name="is_coming_soon"
              checked={formData.is_coming_soon}
              onChange={handleChange}
            />
            Future Batch (Pre-booking open before production cycle completes)
          </label>

          {formData.is_coming_soon && (
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                Estimated Ready Dispatch Date
              </label>
              <input
                type="date"
                name="expected_available_date"
                value={formData.expected_available_date}
                onChange={handleChange}
                required={formData.is_coming_soon}
                className="scrappy-input"
                style={{ fontSize: '12px', width: '220px' }}
              />
            </div>
          )}
        </div>

        {/* Dispatch Location Coordinates */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              Pickup Yard Address *
            </label>
            <input
              type="text"
              name="pickup_address"
              value={formData.pickup_address}
              onChange={handleChange}
              required
              className="scrappy-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              City *
            </label>
            <input
              type="text"
              name="pickup_city"
              value={formData.pickup_city}
              onChange={handleChange}
              required
              className="scrappy-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              State *
            </label>
            <input
              type="text"
              name="pickup_state"
              value={formData.pickup_state}
              onChange={handleChange}
              required
              className="scrappy-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
              PIN *
            </label>
            <input
              type="text"
              name="pickup_pincode"
              value={formData.pickup_pincode}
              onChange={handleChange}
              required
              className="scrappy-input"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: '10px 22px' }}
          >
            {submitting ? 'Submitting & Encrypting Cert...' : 'Publish Scrap Stream'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateListingModal;
