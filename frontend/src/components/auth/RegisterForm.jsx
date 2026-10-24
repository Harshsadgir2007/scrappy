import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import logoSvg from '../../assets/logo.svg';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    role: 'company',
    company_name: '',
    industry: 'Metals & Mining',
    company_reg_num: '',
    company_license: '',
    gstin: '',
    mca_record: '',
    declared_products: '',
    capacity_tons_per_year: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });

  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const industries = [
    'Metals & Mining',
    'Chemicals & Petrochemicals',
    'Construction & Building Materials',
    'Paper & Forest Products',
    'Textiles & Apparel',
    'Energy & Power Generation',
    'Agriculture & Food Processing',
    'Plastics & Rubber',
    'Automotive & Machinery',
    'Electronics & Electricals',
    'Other',
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirm_password) {
      addToast('Passwords do not match', 'error');
      return;
    }

    if (formData.password.length < 8) {
      addToast('Password must be at least 8 characters long', 'warning');
      return;
    }

    try {
      setLoading(true);
      const productsArray = formData.declared_products
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        company_name: formData.company_name,
        industry: formData.industry,
        company_reg_num: formData.company_reg_num || null,
        company_license: formData.company_license || null,
        gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : null,
        mca_record: formData.mca_record || null,
        declared_products: productsArray,
        capacity_tons_per_year: formData.capacity_tons_per_year
          ? parseFloat(formData.capacity_tons_per_year)
          : null,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        phone: formData.phone || null,
      };

      await register(payload);
      addToast('Company registered successfully! Please upload your business license document.', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please check inputs.';
      addToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="scrappy-card"
      style={{
        maxWidth: '900px',
        width: '100%',
        padding: '36px',
        boxShadow: '0 8px 32px rgba(20, 45, 37, 0.08)',
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src={logoSvg}
          alt="Scrappy"
          style={{ width: '44px', height: '44px', margin: '0 auto 12px' }}
        />
        <h2 style={{ fontSize: '24px', color: '#142D25', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
          Register Enterprise Account
        </h2>
        <span
          style={{
            display: 'block',
            fontSize: '10px',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#7B958B',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            marginTop: '4px',
          }}
        >
          Scrappy — Circular Manufacturing Intelligence
        </span>
        <p style={{ color: '#68756D', fontSize: '13px', marginTop: '8px', marginBottom: 0 }}>
          Join the industrial symbiosis network for MSME clusters
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '28px' }}>
          {/* Column 1: Plant & Enterprise Information */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4
              style={{
                color: '#142D25',
                fontSize: '14px',
                fontWeight: 700,
                borderBottom: '1px solid #E1E6DF',
                paddingBottom: '8px',
                margin: 0,
              }}
            >
              1. Plant & Enterprise Information
            </h4>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Company / Plant Name *
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="e.g. Western Alloy Castings Pvt Ltd"
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Primary Industry Sector *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                required
                className="scrappy-select"
              >
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                Declared Products / Outputs *
              </label>
              <input
                type="text"
                name="declared_products"
                placeholder="e.g. Steel Rebar, Billets, Castings (comma-separated)"
                value={formData.declared_products}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
              <span style={{ fontSize: '11px', color: '#68756D', marginTop: '4px', display: 'block' }}>
                Calibrates automated bilateral match indexes
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Annual Capacity (Metric Tons / Year)
              </label>
              <input
                type="number"
                name="capacity_tons_per_year"
                placeholder="e.g. 50000"
                value={formData.capacity_tons_per_year}
                onChange={handleChange}
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Plant Street Address *
              </label>
              <input
                type="text"
                name="address"
                placeholder="Plot / Survey No, MIDC Industrial Area"
                value={formData.address}
                onChange={handleChange}
                required
                className="scrappy-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Pune"
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
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={handleChange}
                  required
                  className="scrappy-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  PIN Code *
                </label>
                <input
                  type="text"
                  name="pincode"
                  placeholder="e.g. 411026"
                  value={formData.pincode}
                  onChange={handleChange}
                  required
                  className="scrappy-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Plant Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+91-20-88776655"
                  value={formData.phone}
                  onChange={handleChange}
                  className="scrappy-input"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Statutory Identifiers & Operator Credentials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4
              style={{
                color: '#142D25',
                fontSize: '14px',
                fontWeight: 700,
                borderBottom: '1px solid #E1E6DF',
                paddingBottom: '8px',
                margin: 0,
              }}
            >
              2. Statutory & Legal Registrations
            </h4>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Company Registration Number (CIN / Reg Num)
              </label>
              <input
                type="text"
                name="company_reg_num"
                placeholder="e.g. U27100MH2015PTC123456"
                value={formData.company_reg_num}
                onChange={handleChange}
                className="scrappy-input"
              />
              <span style={{ fontSize: '11px', color: '#68756D', marginTop: '2px', display: 'block' }}>
                Corporate Identity Number (CIN) or Registrar certificate #
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Company License Number
              </label>
              <input
                type="text"
                name="company_license"
                placeholder="e.g. FAC-MH-PUN-0842/2022"
                value={formData.company_license}
                onChange={handleChange}
                className="scrappy-input"
              />
              <span style={{ fontSize: '11px', color: '#68756D', marginTop: '2px', display: 'block' }}>
                Factory License, Industrial License, or PCB Consent No
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                GSTIN Number (15 Digits)
              </label>
              <input
                type="text"
                name="gstin"
                placeholder="e.g. 27AABCU9603R1ZN"
                maxLength={15}
                value={formData.gstin}
                onChange={handleChange}
                className="scrappy-input"
                style={{ textTransform: 'uppercase' }}
              />
              <span style={{ fontSize: '11px', color: '#68756D', marginTop: '2px', display: 'block' }}>
                Goods & Services Tax Identification Number for invoicing
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                MCA Record / RoC Status
              </label>
              <input
                type="text"
                name="mca_record"
                placeholder="e.g. RoC Pune - Active & Compliant"
                value={formData.mca_record}
                onChange={handleChange}
                className="scrappy-input"
              />
              <span style={{ fontSize: '11px', color: '#68756D', marginTop: '2px', display: 'block' }}>
                Ministry of Corporate Affairs / Registrar of Companies record
              </span>
            </div>

            <h4
              style={{
                color: '#142D25',
                fontSize: '14px',
                fontWeight: 700,
                borderBottom: '1px solid #E1E6DF',
                paddingBottom: '8px',
                margin: '8px 0 0',
              }}
            >
              3. Operator Credentials
            </h4>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Authorized Contact Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Rajesh Sharma"
                required
                className="scrappy-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Corporate Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="rajesh@greensteel.com"
                required
                className="scrappy-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Password (8+ chars) *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="scrappy-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="scrappy-input"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
                fontSize: '12px',
                color: '#68756D',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: '#142D25' }}>Enterprise Security Notice:</strong>
              <p style={{ margin: '4px 0 0' }}>
                Upon onboarding, you will upload statutory factory or pollution board licenses to activate live
                marketplace trading.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ padding: '12px 24px', fontSize: '15px', marginTop: '12px' }}
        >
          {loading ? 'Creating Enterprise Account...' : 'Complete Enterprise Registration'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#68756D' }}>
        Already registered?{' '}
        <Link to="/login" style={{ color: '#142D25', fontWeight: 700, textDecoration: 'underline' }}>
          Sign in to your account
        </Link>
      </div>
    </div>
  );
};

export default RegisterForm;
