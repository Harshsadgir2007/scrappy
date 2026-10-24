import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';

const ensureArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const MaterialCatalogManager = () => {
  const { addToast } = useToast();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [requestFormData, setRequestFormData] = useState({
    name: '',
    category: 'metal',
    description: '',
  });

  const categories = ['textile', 'metal', 'chemical'];

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/materials');
      const normalized = (res.data || []).map((m) => ({
        ...m,
        compatible_industries: ensureArray(m.compatible_industries),
      }));
      setMaterials(normalized);
    } catch (err) {
      addToast('Failed to load material catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/materials/request', requestFormData);
      addToast('Material type request submitted successfully!', 'success');
      setIsRequestModalOpen(false);
      setRequestFormData({ name: '', category: 'metal', description: '' });
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to submit request', 'error');
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    const industries = ensureArray(m.compatible_industries);
    const matchesSearch =
      (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      industries.some((i) => i.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Card */}
      <section className="scrappy-card" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
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
                Taxonomy & Standards
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
                National Circular Inventory
              </span>
            </div>
            <h1 style={{ fontSize: '24px', color: '#142D25', fontWeight: 800, margin: '4px 0 6px' }}>
              Standardized Material Directory & Taxonomies
            </h1>
            <p style={{ color: '#68756D', fontSize: '13px', margin: 0 }}>
              Master taxonomy of certified circular scrap streams. All quantities and valuations across Scrappy
              are standardized in <strong>metric tons (MT)</strong>.
            </p>
          </div>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '13px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add_circle
            </span>
            <span>Request New Material Type</span>
          </button>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section
        className="scrappy-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#68756D',
              fontSize: '18px',
            }}
          >
            search
          </span>
          <input
            type="text"
            placeholder="Search standard materials, industries, or chemical specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="scrappy-input"
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="scrappy-select"
          style={{ width: 'auto', minWidth: '180px', textTransform: 'capitalize' }}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </section>

      {/* Catalog Table */}
      <section className="scrappy-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#68756D' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#142D25', animation: 'spin 1s linear infinite' }}>
              autorenew
            </span>
            <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading catalog...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#68756D' }}>
            No materials found matching your search.
          </div>
        ) : (
          <div className="scrappy-table-wrapper">
            <table className="scrappy-table">
              <thead>
                <tr>
                  <th>Stream Code</th>
                  <th>Standard Material Name</th>
                  <th>Category</th>
                  <th>Hazard Classification</th>
                  <th>Compatible Re-Processing Industries</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((m) => (
                  <tr key={m.id}>
                    <td
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        color: '#142D25',
                      }}
                    >
                      #MAT-{String(m.id).padStart(4, '0')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#142D25', fontSize: '14px' }}>{m.name}</div>
                      <div style={{ fontSize: '12px', color: '#68756D', marginTop: '2px' }}>{m.description}</div>
                    </td>
                    <td>
                      <span
                        className="pill pill-neutral"
                        style={{
                          textTransform: 'uppercase',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '10px',
                        }}
                      >
                        {m.category}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          color:
                            m.hazard_class === 'high'
                              ? '#BA1A1A'
                              : m.hazard_class === 'moderate'
                              ? '#996B00'
                              : '#142D25',
                        }}
                      >
                        {m.hazard_class ? m.hazard_class.toUpperCase() : 'NON-HAZARDOUS'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {ensureArray(m.compatible_industries).map((ind, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#EEEEE5',
                              color: '#252D29',
                              fontSize: '11px',
                              fontWeight: 500,
                            }}
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Request New Material Modal */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request Standard Material Addition"
        maxWidth="540px"
      >
        <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: '#68756D', margin: 0 }}>
            Propose a new industrial scrap taxonomy for technical review and corridor standardization.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Material Name *
            </label>
            <input
              type="text"
              required
              value={requestFormData.name}
              onChange={(e) => setRequestFormData({ ...requestFormData, name: e.target.value })}
              className="scrappy-input"
              placeholder="e.g. Copper Clad Laminate Trimmings"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Category *
            </label>
            <select
              value={requestFormData.category}
              onChange={(e) => setRequestFormData({ ...requestFormData, category: e.target.value })}
              className="scrappy-select"
            >
              <option value="metal">Metal</option>
              <option value="chemical">Chemical / Mineral</option>
              <option value="textile">Textile</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
              Description & Specifications
            </label>
            <textarea
              value={requestFormData.description}
              onChange={(e) => setRequestFormData({ ...requestFormData, description: e.target.value })}
              className="scrappy-textarea"
              rows={3}
              placeholder="Provide typical chemical composition, moisture tolerance, and re-processing use cases..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Submit Material Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaterialCatalogManager;
