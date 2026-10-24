import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Modal from '../components/common/Modal';

const TradeHistoryPage = () => {
  const { company } = useAuth();
  const { addToast } = useToast();

  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all'); // 'all', 'buyer', 'seller'
  const [selectedTrade, setSelectedTrade] = useState(null);

  const fetchTradeHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [historyRes, statsRes] = await Promise.all([
        api.get('/trades/history', {
          params: { role: roleFilter !== 'all' ? roleFilter : undefined },
        }),
        api.get('/trades/stats'),
      ]);
      setTrades(historyRes.data);
      setStats(statsRes.data);
    } catch {
      addToast('Failed to load trade ledger records', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, addToast]);

  useEffect(() => {
    fetchTradeHistory();
  }, [fetchTradeHistory]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', color: '#1B4332', margin: '0 0 6px 0' }}>
          Permanent Trade History & Circular Economy Ledger
        </h1>
        <p style={{ color: '#6C757D', fontSize: '14px', margin: 0 }}>
          Immutable records of completed material transactions logged simultaneously at both the Buyer's end and the Seller's end.
        </p>
      </div>

      {/* Circular Economy Impact & KPI Banner */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #1B4332' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Total Traded Volume</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              {stats.total_traded_tons} Tons
            </div>
            <div style={{ fontSize: '11px', color: '#2D6A4F', marginTop: '4px' }}>
              Diverted from landfills & virgin mining
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #2D6A4F' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Total Settled Value</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              ₹{stats.total_traded_value_inr.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '4px' }}>
              Executed circular trades
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #52B788' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>CO₂ Emissions Offset</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              {(stats.total_co2_offset_kg / 1000).toFixed(1)} MT CO₂e
            </div>
            <div style={{ fontSize: '11px', color: '#2D6A4F', marginTop: '4px' }}>
              ({stats.total_co2_offset_kg.toLocaleString()} kg CO₂ avoided)
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', borderLeft: '4px solid #0077B6' }}>
            <div style={{ fontSize: '12px', color: '#6C757D', fontWeight: 600, textTransform: 'uppercase' }}>Transactions Executed</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#1B4332', marginTop: '4px' }}>
              {stats.total_trades_count} Trades
            </div>
            <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '4px' }}>
              {stats.as_buyer_trades} as Buyer &bull; {stats.as_seller_trades} as Seller
            </div>
          </div>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '2px solid #E9ECEF' }}>
        {[
          { key: 'all', label: `All Recorded Trades (${trades.length})` },
          { key: 'buyer', label: `Purchases (As Buyer) [${stats?.as_buyer_trades || 0}]` },
          { key: 'seller', label: `Sales (As Seller) [${stats?.as_seller_trades || 0}]` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleFilter(tab.key)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: roleFilter === tab.key ? '3px solid #2D6A4F' : 'none',
              fontWeight: roleFilter === tab.key ? 700 : 500,
              color: roleFilter === tab.key ? '#2D6A4F' : '#6C757D',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trade Ledger Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6C757D' }}>Loading trade records...</div>
        ) : trades.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6C757D' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📜</div>
            <div style={{ fontWeight: 600, fontSize: '16px', color: '#212529', marginBottom: '6px' }}>
              No finalized trade records found
            </div>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Trades are recorded here automatically at both the Buyer's and Seller's end when consignments are marked delivered.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #E9ECEF', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Trade Reference</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Role</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Material & Category</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Counterparty Enterprise</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Quantity</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Total Landed Value</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Delivered Date</th>
                <th style={{ padding: '12px 16px', color: '#495057', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const isBuyer = t.my_role === 'BUYER';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #E9ECEF' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#1B4332' }}>{t.trade_number}</div>
                      <div style={{ fontSize: '11px', color: '#6C757D' }}>
                        Ref: Order #{t.tracking_number || t.order_id}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isBuyer ? '#D4EDDA' : '#CCE5FF',
                        color: isBuyer ? '#155724' : '#004085',
                      }}>
                        {isBuyer ? '📥 BUYER' : '📤 SELLER'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{t.listing_title}</div>
                      <div style={{ fontSize: '11px', color: '#2D6A4F', textTransform: 'capitalize' }}>
                        {t.material_name} &bull; {t.category}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{t.counterparty_name}</div>
                      <div style={{ fontSize: '11px', color: '#6C757D' }}>
                        📍 {t.counterparty_location}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ fontSize: '14px' }}>{t.traded_tons} Tons</strong>
                      <div style={{ fontSize: '11px', color: '#2D6A4F' }}>
                        🌱 {(t.carbon_offset_kg / 1000).toFixed(1)} MT CO₂
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <strong style={{ color: '#1B4332', fontSize: '14px' }}>
                        ₹{t.total_landed_cost.toLocaleString()}
                      </strong>
                      <div style={{ fontSize: '11px', color: '#6C757D' }}>
                        Freight: ₹{t.freight_cost.toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 500 }}>
                        {new Date(t.delivery_date).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6C757D' }}>
                        {t.vehicle_number ? `Truck: ${t.vehicle_number}` : 'Delivered'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedTrade(t)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#F8F9FA',
                          border: '1px solid #CED4DA',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: '#1B4332',
                        }}
                      >
                        📄 Certificate & Slip
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Digital Trade Certificate & Invoice Slip Modal */}
      <Modal
        isOpen={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        title="Circular Economy Trade Certificate & Settlement Slip"
        maxWidth="700px"
      >
        {selectedTrade && (
          <div>
            <div style={{
              border: '2px solid #2D6A4F',
              borderRadius: '8px',
              padding: '24px',
              backgroundColor: '#FAFCFA',
              marginBottom: '20px',
            }}>
              {/* Certificate Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2D6A4F', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#1B4332' }}>SCRAPPY INDUSTRIAL EXCHANGE</div>
                  <div style={{ fontSize: '12px', color: '#40916C', fontWeight: 600 }}>CIRCULAR ECONOMY SETTLEMENT CERTIFICATE</div>
                  <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '2px' }}>Standard Industrial By-Product & Scrap Ledger</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1B4332' }}>{selectedTrade.trade_number}</div>
                  <div style={{ fontSize: '11px', color: '#6C757D' }}>Settled: {new Date(selectedTrade.delivery_date).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Parties */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '13px' }}>
                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E9ECEF' }}>
                  <div style={{ fontSize: '11px', color: '#6C757D', fontWeight: 700, textTransform: 'uppercase' }}>SELLER / PRODUCER</div>
                  <div style={{ fontWeight: 700, color: '#212529', marginTop: '4px' }}>{selectedTrade.seller_name}</div>
                  <div style={{ fontSize: '11px', color: '#6C757D' }}>Enterprise Verified Producer</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E9ECEF' }}>
                  <div style={{ fontSize: '11px', color: '#6C757D', fontWeight: 700, textTransform: 'uppercase' }}>BUYER / CONSUMER</div>
                  <div style={{ fontWeight: 700, color: '#212529', marginTop: '4px' }}>{selectedTrade.buyer_name}</div>
                  <div style={{ fontSize: '11px', color: '#6C757D' }}>Enterprise Secondary Processor</div>
                </div>
              </div>

              {/* Material & Financials Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#E8F5E9', borderBottom: '1px solid #C8E6C9', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', color: '#1B4332' }}>Item Description</th>
                    <th style={{ padding: '8px 12px', color: '#1B4332', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '8px 12px', color: '#1B4332', textAlign: 'right' }}>Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <strong>{selectedTrade.listing_title}</strong>
                      <div style={{ fontSize: '11px', color: '#6C757D' }}>Classification: {selectedTrade.category}</div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{selectedTrade.traded_tons} Tons</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{selectedTrade.material_cost.toLocaleString()}</td>
                  </tr>
                  {selectedTrade.processing_cost > 0 && (
                    <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                      <td style={{ padding: '8px 12px' }}>Value-Add Sorting & Conditioning Fee</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{selectedTrade.traded_tons} Tons</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{selectedTrade.processing_cost.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                    <td style={{ padding: '8px 12px' }}>
                      Freight Transport ({selectedTrade.distance_km} km) & FASTag Tolls
                      <div style={{ fontSize: '11px', color: '#6C757D' }}>
                        Carrier: {selectedTrade.carrier_name || 'Designated Freight Hauler'} ({selectedTrade.vehicle_number || 'Standard Fleet'})
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>-</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      ₹{(selectedTrade.freight_cost + selectedTrade.toll_cost).toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#F0FFF4' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1B4332' }}>Total Landed Settlement</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{selectedTrade.traded_tons} Tons</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: '#1B4332', fontSize: '15px' }}>
                      ₹{selectedTrade.total_landed_cost.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Environmental Carbon Stamp */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#E8F5E9',
                borderRadius: '6px',
                border: '1px solid #C8E6C9',
              }}>
                <div style={{ fontSize: '24px' }}>🌿</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1B4332' }}>
                    CIRCULAR ECONOMY ENVIRONMENTAL IMPACT AUDITED
                  </div>
                  <div style={{ fontSize: '11px', color: '#2D6A4F' }}>
                    This transaction saved an estimated <strong>{selectedTrade.carbon_offset_kg.toLocaleString()} kg CO₂e</strong> by substituting virgin raw material extraction with secondary industrial reuse.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#2D6A4F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🖨️ Print Certificate
              </button>
              <button
                onClick={() => setSelectedTrade(null)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #CED4DA',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TradeHistoryPage;
