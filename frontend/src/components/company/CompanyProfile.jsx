import React, { useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import LicenseUpload from './LicenseUpload';

const safeProductsToString = (products) => {
  if (!products) return '';
  if (Array.isArray(products)) return products.join(', ');
  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch (e) {}
    return products;
  }
  return '';
};

const CompanyProfile = () => {
  const { company, reloadCompany } = useAuth();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: company?.name || '',
    industry: company?.industry || '',
    company_reg_num: company?.company_reg_num || '',
    company_license: company?.company_license || '',
    gstin: company?.gstin || '',
    mca_record: company?.mca_record || '',
    declared_products: safeProductsToString(company?.declared_products),
    capacity_tons_per_year: company?.capacity_tons_per_year || '',
    address: company?.address || '',
    city: company?.city || '',
    state: company?.state || '',
    pincode: company?.pincode || '',
    phone: company?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        industry: formData.industry,
        company_reg_num: formData.company_reg_num || null,
        company_license: formData.company_license || null,
        gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : null,
        mca_record: formData.mca_record || null,
        declared_products: formData.declared_products.split(',').map((p) => p.trim()).filter(Boolean),
        capacity_tons_per_year: formData.capacity_tons_per_year ? parseFloat(formData.capacity_tons_per_year) : null,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        phone: formData.phone || null,
      };

      await api.put('/companies/me', payload);
      addToast('Profile updated successfully!', 'success');
      await reloadCompany();
      setEditing(false);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update company profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="scrappy-card" style={{ padding: '40px', textAlign: 'center' }}>
        No company record found.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Profile Card */}
      <section className="scrappy-card" style={{ padding: '28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#68756D',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Enterprise Registry
              </span>
              <span style={{ color: '#E1E6DF' }}>/</span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#142D25',
                }}
              >
                Facility Profile
              </span>
            </div>
            <h1 style={{ fontSize: '26px', color: '#142D25', fontWeight: 800, margin: '4px 0 6px' }}>
              {company.name}
            </h1>
            <div
              style={{
                color: '#68756D',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Enterprise ID: #CP-WST-{String(company.id).padStart(4, '0')} • Onboarded on{' '}
              {new Date(company.created_at).toLocaleDateString()}
            </div>
          </div>

          <button
            onClick={() => setEditing(!editing)}
            className={editing ? 'btn-secondary' : 'btn-primary'}
            style={{ fontSize: '13px', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              {editing ? 'close' : 'edit'}
            </span>
            <span>{editing ? 'Cancel Editing' : 'Edit Facility Data'}</span>
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Enterprise Legal Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Industry Sector *
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Annual Capacity (Metric Tons / Year)
              </label>
              <input
                type="number"
                name="capacity_tons_per_year"
                value={formData.capacity_tons_per_year}
                onChange={handleChange}
                className="scrappy-input"
              />
            </div>

            {/* Statutory Parameters */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Company Registration Number (CIN)
              </label>
              <input
                type="text"
                name="company_reg_num"
                value={formData.company_reg_num}
                onChange={handleChange}
                placeholder="e.g. U27100MH2012PTC139882"
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Company License Number
              </label>
              <input
                type="text"
                name="company_license"
                value={formData.company_license}
                onChange={handleChange}
                placeholder="e.g. FAC-MH-PUN-0842/2012"
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                GSTIN Number (15 Digits)
              </label>
              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="e.g. 27AABCG1234F1Z5"
                maxLength={15}
                className="scrappy-input"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                MCA Record / RoC Status
              </label>
              <input
                type="text"
                name="mca_record"
                value={formData.mca_record}
                onChange={handleChange}
                placeholder="e.g. RoC Mumbai - Active & Compliant"
                className="scrappy-input"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Declared Products / Outputs (comma-separated for matching algorithms) *
              </label>
              <input
                type="text"
                name="declared_products"
                value={formData.declared_products}
                onChange={handleChange}
                required
                className="scrappy-input"
                placeholder="e.g. Steel Billets, Fe 550D TMT Rebars, Castings"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Plant Facility Street Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                State *
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                PIN Code *
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Contact Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="scrappy-input"
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '10px 24px' }}>
                {saving ? 'Updating Records...' : 'Save Profile Changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Industrial Sector
              </span>
              <strong style={{ fontSize: '14px', color: '#142D25' }}>{company.industry}</strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Annual Capacity
              </span>
              <strong
                style={{
                  fontSize: '14px',
                  color: '#142D25',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {company.capacity_tons_per_year
                  ? `${company.capacity_tons_per_year.toLocaleString()} MT/year`
                  : 'Not Declared'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Registration (CIN)
              </span>
              <strong style={{ fontSize: '13px', color: '#142D25', fontFamily: 'JetBrains Mono, monospace' }}>
                {company.company_reg_num || 'Not declared'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Factory / PCB License
              </span>
              <strong style={{ fontSize: '13px', color: '#142D25', fontFamily: 'JetBrains Mono, monospace' }}>
                {company.company_license || 'Not declared'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                GSTIN Number
              </span>
              <strong style={{ fontSize: '13px', color: '#142D25', fontFamily: 'JetBrains Mono, monospace' }}>
                {company.gstin || 'Not declared'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                MCA / RoC Record
              </span>
              <strong style={{ fontSize: '13px', color: '#142D25' }}>
                {company.mca_record || 'Not declared'}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Dispatch Hub Coordinates
              </span>
              <strong style={{ fontSize: '14px', color: '#142D25' }}>
                {company.city}, {company.state} ({company.pincode})
              </strong>
            </div>

            <div
              style={{
                gridColumn: '1 / -1',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Declared Products & Re-processing Capabilities:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {safeProductsToString(company.declared_products)
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .map((prod, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E1E6DF',
                        color: '#142D25',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      ✓ {prod}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* License Upload Section */}
      <LicenseUpload />
    </div>
  );
};

export default CompanyProfile;
