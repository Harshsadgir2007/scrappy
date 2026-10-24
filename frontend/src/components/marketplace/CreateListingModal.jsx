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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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

      await api.post('/listings', payload);
      addToast('Scrap listing published live to marketplace!', 'success');
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to create listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Publish Industrial Scrap / By-Product Listing"
      maxWidth="720px"
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
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
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: '10px 22px' }}
          >
            {submitting ? 'Publishing...' : 'Publish Scrap Stream'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateListingModal;
