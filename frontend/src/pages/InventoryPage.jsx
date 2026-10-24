import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Modal from '../components/common/Modal';
import StepByStepListingModal from '../components/marketplace/StepByStepListingModal';

const InventoryPage = () => {
  const { company } = useAuth();
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [listingItem, setListingItem] = useState(null);

  // Add Item Form State
  const [materials, setMaterials] = useState([]);
  const [addForm, setAddForm] = useState({
    material_id: '',
    material_name: '',
    category: 'steel scrap',
    title: '',
    description: '',
    quantity_tons: '',
    actual_cost_per_ton: '',
    is_processed: false,
    processing_details: '',
    processed_cost_per_ton: '0',
    storage_location: '',
    city: company?.city || '',
    state: company?.state || '',
    pincode: company?.pincode || '',
    freight_rate_per_ton_km: '3.5',
    estimated_tolls: '500',
    notes: '',
  });

  // Edit Item Form State
  const [editForm, setEditForm] = useState({
    quantity_tons: '',
    actual_cost_per_ton: '',
    storage_location: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const [itemsRes, summaryRes] = await Promise.all([
        api.get('/inventory', {
          params: {
            category: categoryFilter !== 'all' ? categoryFilter : undefined,
            search: search || undefined,
          },
        }),
        api.get('/inventory/summary'),
      ]);
      setItems(itemsRes.data);
      setSummary(summaryRes.data);
    } catch {
      addToast('Failed to load inventory stock', 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, addToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    api.get('/materials').then((res) => setMaterials(res.data)).catch(() => {});
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const selectedMat = materials.find((m) => m.id === parseInt(addForm.material_id));
      await api.post('/inventory', {
        material_id: addForm.material_id ? parseInt(addForm.material_id) : null,
        material_name: selectedMat ? selectedMat.name : addForm.material_name,
        category: addForm.category,
        title: addForm.title,
        description: addForm.description,
        quantity_tons: parseFloat(addForm.quantity_tons),
        actual_cost_per_ton: parseFloat(addForm.actual_cost_per_ton),
        is_processed: addForm.is_processed,
        processing_details: addForm.is_processed ? addForm.processing_details : null,
        processed_cost_per_ton: addForm.is_processed ? parseFloat(addForm.processed_cost_per_ton) : 0,
        storage_location: addForm.storage_location || `${company?.name || 'Factory'} Yard`,
        city: addForm.city || company?.city,
        state: addForm.state || company?.state,
        pincode: addForm.pincode || company?.pincode,
        freight_rate_per_ton_km: parseFloat(addForm.freight_rate_per_ton_km) || 3.5,
        estimated_tolls: parseFloat(addForm.estimated_tolls) || 0,
        notes: addForm.notes,
      });

      addToast(`Added "${addForm.title}" to inventory stock`, 'success');
      setShowAddModal(false);
      setAddForm({
        material_id: '',
        material_name: '',
        category: 'steel scrap',
        title: '',
        description: '',
        quantity_tons: '',
        actual_cost_per_ton: '',
        is_processed: false,
        processing_details: '',
        processed_cost_per_ton: '0',
        storage_location: '',
        city: company?.city || '',
        state: company?.state || '',
        pincode: company?.pincode || '',
        freight_rate_per_ton_km: '3.5',
        estimated_tolls: '500',
        notes: '',
      });
      fetchInventory();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to add inventory item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    try {
      setSubmitting(true);
      await api.put(`/inventory/${editItem.id}`, {
        quantity_tons: parseFloat(editForm.quantity_tons),
        actual_cost_per_ton: parseFloat(editForm.actual_cost_per_ton),
        storage_location: editForm.storage_location,
        notes: editForm.notes,
      });
      addToast('Inventory stock updated successfully', 'success');
      setEditItem(null);
      fetchInventory();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update stock', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to remove "${item.title}" from your inventory?`)) return;
    try {
      await api.delete(`/inventory/${item.id}`);
      addToast(`Removed "${item.title}" from inventory`, 'success');
      fetchInventory();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to delete item', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_stock':
        return <span style={{ padding: '3px 8px', borderRadius: '10px', backgroundColor: '#D4EDDA', color: '#155724', fontSize: '11px', fontWeight: 600 }}>● In Stock</span>;
      case 'low_stock':
        return <span style={{ padding: '3px 8px', borderRadius: '10px', backgroundColor: '#FFF3CD', color: '#856404', fontSize: '11px', fontWeight: 600 }}>⚠ Low Stock</span>;
      case 'depleted':
        return <span style={{ padding: '3px 8px', borderRadius: '10px', backgroundColor: '#F8D7DA', color: '#721C24', fontSize: '11px', fontWeight: 600 }}>✕ Depleted</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '10px', backgroundColor: '#E9ECEF', color: '#495057', fontSize: '11px' }}>{status}</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', color: '#1B4332', margin: '0 0 6px 0' }}>
            Enterprise Inventory & Warehouse Stock
          </h1>
          <p style={{ color: '#6C757D', fontSize: '14px', margin: 0 }}>
            Track secondary materials, production scrap & industrial by-products stored across your facilities.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setListingItem({})}
            style={{
              padding: '10px 18px',
              backgroundColor: '#1B4332',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚡ List Material (Wizard)
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 18px',
              backgroundColor: '#2D6A4F',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            + Add Stock Item
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #2D6A4F' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Total Stock Volume</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              {summary.total_stock_tons} Tons
            </div>
            <div style={{ fontSize: '11px', color: '#2D6A4F', marginTop: '4px' }}>Across all facilities</div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #40916C' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Stock Valuation</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              ₹{summary.total_valuation_inr.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '4px' }}>Total book inventory value</div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #52B788' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Active Materials</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              {summary.item_count} Lots
            </div>
            <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '4px' }}>In warehouse storage</div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #F77F00' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock Watch</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: summary.low_stock_count > 0 ? '#D9480F' : '#1B4332', marginTop: '4px' }}>
              {summary.low_stock_count} Items
            </div>
            <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '4px' }}>≤ 10 Metric Tons available</div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '18px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search inventory by title or material..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '9px 14px', borderRadius: '6px', border: '1px solid #CED4DA', fontSize: '13px' }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'steel scrap', 'fly ash', 'textile waste'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: categoryFilter === cat ? '2px solid #2D6A4F' : '1px solid #CED4DA',
                backgroundColor: categoryFilter === cat ? '#E8F5E9' : '#fff',
                color: categoryFilter === cat ? '#1B4332' : '#495057',
                fontWeight: categoryFilter === cat ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6C757D' }}>Loading inventory records...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6C757D' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
            <div style={{ fontWeight: 600, fontSize: '16px', color: '#212529', marginBottom: '6px' }}>
              No inventory items found
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>
              Add secondary materials to your warehouse stock or create listings on the exchange.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ padding: '8px 18px', backgroundColor: '#2D6A4F', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Add First Stock Item
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #E9ECEF', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Material / Lot</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Category</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Physical Stock</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Unit Cost (Actual + Proc)</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Total Valuation</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Location</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#495057', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #E9ECEF' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#1B4332' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#6C757D' }}>
                      Ref: {item.material_name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      backgroundColor: '#E8F5E9',
                      color: '#2D6A4F',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <strong style={{ fontSize: '14px', color: '#212529' }}>{item.quantity_tons} Tons</strong>
                    {item.reserved_tons > 0 && (
                      <div style={{ fontSize: '11px', color: '#D9480F' }}>
                        {item.reserved_tons} T reserved
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600 }}>₹{item.total_unit_cost.toLocaleString()} / T</div>
                    <div style={{ fontSize: '11px', color: '#6C757D' }}>
                      Actual: ₹{item.actual_cost_per_ton.toLocaleString()}
                      {item.is_processed && ` + Proc: ₹${item.processed_cost_per_ton}`}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1B4332' }}>
                    ₹{item.total_valuation.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 500 }}>{item.city}, {item.state}</div>
                    <div style={{ fontSize: '11px', color: '#6C757D' }}>{item.storage_location}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {getStatusBadge(item.status)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setListingItem(item)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#2D6A4F',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="List this lot to Scrappy Marketplace"
                      >
                        ⚡ List
                      </button>
                      <button
                        onClick={() => {
                          setEditItem(item);
                          setEditForm({
                            quantity_tons: item.quantity_tons,
                            actual_cost_per_ton: item.actual_cost_per_ton,
                            storage_location: item.storage_location || '',
                            notes: item.notes || '',
                          });
                        }}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#F8F9FA',
                          border: '1px solid #CED4DA',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        style={{
                          padding: '5px 8px',
                          backgroundColor: '#FFF5F5',
                          border: '1px solid #FFA8A8',
                          color: '#C92A2A',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Stock Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Material to Warehouse Inventory"
        maxWidth="650px"
      >
        <form onSubmit={handleAddSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Material Category *
              </label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              >
                <option value="steel scrap">Steel Scrap (Metal)</option>
                <option value="fly ash">Fly Ash (Pozzolanic)</option>
                <option value="textile waste">Textile Waste (Fibers)</option>
                <option value="chemical">Chemical By-Product</option>
                <option value="other">Other Industrial Scrap</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Catalog Material
              </label>
              <select
                value={addForm.material_id}
                onChange={(e) => setAddForm({ ...addForm, material_id: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              >
                <option value="">-- Choose Standard Catalog Item --</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Stock Item Title *
            </label>
            <input
              type="text"
              required
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              placeholder="e.g. Mild Steel Sheet Off-cuts Lot #12"
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Stock Quantity (Metric Tons) *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={addForm.quantity_tons}
                onChange={(e) => setAddForm({ ...addForm, quantity_tons: e.target.value })}
                placeholder="e.g. 50"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Actual Cost (₹ / Ton) *
              </label>
              <input
                type="number"
                step="50"
                required
                value={addForm.actual_cost_per_ton}
                onChange={(e) => setAddForm({ ...addForm, actual_cost_per_ton: e.target.value })}
                placeholder="e.g. 26000"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px', padding: '12px', backgroundColor: '#F8F9FA', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={addForm.is_processed}
                onChange={(e) => setAddForm({ ...addForm, is_processed: e.target.checked })}
              />
              Material is processed / sorted / conditioned
            </label>

            {addForm.is_processed && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder="Processing method (e.g. baled, shredded)"
                  value={addForm.processing_details}
                  onChange={(e) => setAddForm({ ...addForm, processing_details: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
                <input
                  type="number"
                  placeholder="Cost (₹/Ton)"
                  value={addForm.processed_cost_per_ton}
                  onChange={(e) => setAddForm({ ...addForm, processed_cost_per_ton: e.target.value })}
                  style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Storage Location / Yard
              </label>
              <input
                type="text"
                value={addForm.storage_location}
                onChange={(e) => setAddForm({ ...addForm, storage_location: e.target.value })}
                placeholder="e.g. Yard 2, Bhosari Gate"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                City
              </label>
              <input
                type="text"
                value={addForm.city}
                onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                placeholder="e.g. Pune"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              style={{ padding: '8px 16px', background: '#F8F9FA', border: '1px solid #CED4DA', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                backgroundColor: '#2D6A4F',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Adding...' : 'Add to Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Adjust Stock — ${editItem?.title}`}
        maxWidth="500px"
      >
        {editItem && (
          <form onSubmit={handleEditSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Stock Available (Metric Tons) *
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={editForm.quantity_tons}
                onChange={(e) => setEditForm({ ...editForm, quantity_tons: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Actual Base Cost (₹ / Ton) *
              </label>
              <input
                type="number"
                step="50"
                required
                value={editForm.actual_cost_per_ton}
                onChange={(e) => setEditForm({ ...editForm, actual_cost_per_ton: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Storage Location
              </label>
              <input
                type="text"
                value={editForm.storage_location}
                onChange={(e) => setEditForm({ ...editForm, storage_location: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Internal Notes
              </label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                style={{ padding: '8px 16px', background: '#F8F9FA', border: '1px solid #CED4DA', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '8px 20px',
                  backgroundColor: '#2D6A4F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Saving...' : 'Save Adjustments'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Guided Step-by-Step Listing Wizard */}
      <StepByStepListingModal
        isOpen={!!listingItem}
        onClose={() => setListingItem(null)}
        onCreated={() => {
          fetchInventory();
          addToast('Listing created and synchronized with inventory!', 'success');
        }}
        initialData={listingItem && Object.keys(listingItem).length > 0 ? listingItem : null}
      />
    </div>
  );
};

export default InventoryPage;
