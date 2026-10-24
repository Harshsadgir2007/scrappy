import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import OrderModal from '../components/marketplace/OrderModal';
import CreateListingModal from '../components/marketplace/CreateListingModal';
import ResubmitCertificateModal from '../components/marketplace/ResubmitCertificateModal';

const MarketplacePage = () => {
  const { company } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Resubmit Quality Certificate Modal
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitListing, setResubmitListing] = useState(null);

  // 'available', 'coming_soon', or 'my_listings'
  const [activeStreamType, setActiveStreamType] = useState('available');

  // Company Subscription Status
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

  const isVerified = company?.verification_status === 'verified';

  // Check Subscription Status
  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setSubLoading(true);
      const res = await api.get('/subscriptions/status');
      setSubscription(res.data);
    } catch {
      // Admin or unauthenticated
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      if (activeStreamType === 'my_listings') {
        const res = await api.get('/listings/my-listings');
        setListings(res.data);
      } else {
        const isComingSoon = activeStreamType === 'coming_soon';
        let url = `/listings?is_coming_soon=${isComingSoon}`;
        if (selectedCategory !== 'all') {
          url += `&category=${selectedCategory}`;
        }
        const res = await api.get(url);
        setListings(res.data);
      }
    } catch (err) {
      addToast('Failed to load marketplace listings', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeStreamType, selectedCategory, addToast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleOpenOrder = (listing) => {
    if (subscription && !subscription.is_active) {
      addToast(
        'Annual Company Subscription is inactive. Please renew your subscription to place orders.',
        'warning'
      );
      navigate('/subscription');
      return;
    }
    if (!isVerified) {
      addToast('Please upload your business license to verify your enterprise before ordering', 'warning');
      return;
    }
    if (listing.company_id === company?.id) {
      addToast('This is your own company listing', 'info');
      return;
    }
    setSelectedListing(listing);
    setIsOrderModalOpen(true);
  };

  const handleOpenCreateListing = () => {
    if (subscription && !subscription.is_active) {
      addToast(
        'Annual Company Subscription is inactive. Please renew your subscription to publish listings.',
        'warning'
      );
      navigate('/subscription');
      return;
    }
    if (!isVerified) {
      addToast('Upload your company license to activate selling', 'warning');
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handleDownloadCertificate = async (certId, filename) => {
    if (!certId) {
      addToast('No certificate document found for this listing', 'info');
      return;
    }
    try {
      const res = await api.get(`/quality/certificates/${certId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename || `Quality_Certificate_${certId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('Decrypted certificate downloaded successfully', 'success');
    } catch {
      addToast('Failed to download decrypted quality certificate', 'error');
    }
  };

  const filtered = listings.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      (l.title && l.title.toLowerCase().includes(term)) ||
      (l.material_name && l.material_name.toLowerCase().includes(term)) ||
      (l.pickup_city && l.pickup_city.toLowerCase().includes(term)) ||
      (l.pickup_state && l.pickup_state.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Subscription Warning Banner if Inactive/Expired ────────────────── */}
      {subscription && !subscription.is_active && (
        <section
          style={{
            backgroundColor: '#FFF4E5',
            border: '2px solid #FFA726',
            borderRadius: '12px',
            padding: '16px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="material-symbols-outlined" style={{ color: '#E65100', fontSize: '32px' }}>
              lock
            </span>
            <div>
              <strong style={{ color: '#E65100', fontSize: '15px' }}>
                Annual Company Subscription Inactive / Expired
              </strong>
              <p style={{ margin: '4px 0 0', color: '#6D4C41', fontSize: '13px' }}>
                Your enterprise subscription status is currently <strong>{subscription.status.toUpperCase()}</strong>.
                Marketplace trading, listing creation, and ordering are restricted until the company subscription (₹2,500/year) is active.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/subscription')}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              backgroundColor: '#E65100',
              borderColor: '#E65100',
            }}
          >
            Renew Subscription (₹2,500)
          </button>
        </section>
      )}

      {/* ── Top Operational Subheader / Cluster Status ────────────────── */}
      <section className="scrappy-card" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ maxWidth: '820px' }}>
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
                Industrial Operations
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
                Bilateral Secondary Material Marketplace
              </span>
            </div>

            <h1
              style={{
                fontSize: '26px',
                color: '#142D25',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '4px 0 6px',
              }}
            >
              Verified Secondary Materials & By-Product Streams
            </h1>
            <p style={{ color: '#68756D', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Real-time metallurgical inventory across Western Steel Belt & Hazira-Surat Industrial Corridor. All
              lots backed by mandatory accredited quality certificates with automated furnace-grade matching.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenCreateListing}
              className="btn-primary"
              style={{ padding: '10px 18px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                add_circle
              </span>
              <span>Create Material Listing</span>
            </button>
          </div>
        </div>

        {/* Cluster Operational Telemetry Ribbon */}
        <div
          style={{
            marginTop: '20px',
            backgroundColor: '#142D25',
            color: '#FAFBF7',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)', paddingRight: '12px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#7B958B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Available Tonnage
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>1,480</span>
              <span style={{ fontSize: '12px', color: '#B8E36A', fontFamily: 'JetBrains Mono, monospace' }}>
                MT
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#7B958B' }}>Across 38 certified lots</span>
          </div>

          <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)', paddingRight: '12px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#7B958B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Active Origin Plants
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>24</span>
              <span style={{ fontSize: '12px', color: '#FAFBF7' }}>Mills</span>
            </div>
            <span style={{ fontSize: '10px', color: '#B8E36A' }}>100% Quality Audited</span>
          </div>

          <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)', paddingRight: '12px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#7B958B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Commission Rate
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>0.5%</span>
              <span style={{ fontSize: '12px', color: '#7B958B', fontFamily: 'JetBrains Mono, monospace' }}>
                &gt; ₹5L
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#7B958B' }}>0.25% Buyer / 0.25% Seller</span>
          </div>

          <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)', paddingRight: '12px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#7B958B',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Company Subscription
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#B8E36A', fontFamily: 'Inter, sans-serif' }}>
                ₹2,500
              </span>
              <span style={{ fontSize: '12px', color: '#B8E36A', fontFamily: 'JetBrains Mono, monospace' }}>
                / year
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#7B958B' }}>All authorized enterprise users</span>
          </div>
        </div>
      </section>

      {/* ── Controls, Tabs & Search ──────────────────────────────────── */}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Main Stream Type Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveStreamType('available')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: activeStreamType === 'available' ? '#142D25' : '#EEEEE5',
                color: activeStreamType === 'available' ? '#FAFBF7' : '#252D29',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                inventory_2
              </span>
              <span>Available Ready Stock</span>
            </button>

            <button
              onClick={() => setActiveStreamType('coming_soon')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: activeStreamType === 'coming_soon' ? '#142D25' : '#EEEEE5',
                color: activeStreamType === 'coming_soon' ? '#FAFBF7' : '#252D29',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                event_upcoming
              </span>
              <span>Upcoming / Pre-Book Batches</span>
            </button>

            <button
              onClick={() => setActiveStreamType('my_listings')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: activeStreamType === 'my_listings' ? '#142D25' : '#EEEEE5',
                color: activeStreamType === 'my_listings' ? '#FAFBF7' : '#252D29',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                apartment
              </span>
              <span>My Company Listings & Certs</span>
            </button>
          </div>

          {/* Category Chips (when not in my_listings) */}
          {activeStreamType !== 'my_listings' && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Streams' },
                { id: 'scrap', label: 'Production Scrap' },
                { id: 'by_product', label: 'By-Products' },
                { id: 'leftover', label: 'Leftover Materials' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: selectedCategory === cat.id ? 700 : 500,
                    backgroundColor: selectedCategory === cat.id ? '#B8E36A' : '#F4F4EB',
                    color: selectedCategory === cat.id ? '#142D25' : '#252D29',
                    border: '1px solid',
                    borderColor: selectedCategory === cat.id ? '#B8E36A' : '#E1E6DF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
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
            placeholder="Search by material stream, title, city (e.g. Steel Slag, Pune, Ferrous)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="scrappy-input"
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </section>

      {/* ── Listings Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="scrappy-card" style={{ padding: '60px', textAlign: 'center', color: '#68756D' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '32px', color: '#142D25', animation: 'spin 1s linear infinite' }}
          >
            autorenew
          </span>
          <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500 }}>
            Loading material streams & certification data...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="scrappy-card" style={{ padding: '60px', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#68756D', marginBottom: '8px' }}>
            filter_alt_off
          </span>
          <h3 style={{ color: '#142D25', marginBottom: '6px', fontSize: '18px' }}>
            {activeStreamType === 'my_listings' ? 'No Company Listings Found' : 'No Material Streams Found'}
          </h3>
          <p style={{ color: '#68756D', fontSize: '13px', margin: 0 }}>
            {activeStreamType === 'my_listings'
              ? 'Your enterprise has not submitted any material listings yet. Click "Create Material Listing" above.'
              : 'No streams match your filter criteria. Try adjusting your search or create a new scrap listing.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}
        >
          {filtered.map((l) => (
            <div
              key={l.id}
              className="scrappy-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                position: 'relative',
              }}
            >
              <div>
                {/* Header tags */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: '#142D25',
                        backgroundColor: '#EEEEE5',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {l.material_category || 'Industrial'}
                    </span>

                    {/* Quality Certificate Status Badge */}
                    {activeStreamType === 'my_listings' ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            l.quality_status === 'approved'
                              ? '#D8F3DC'
                              : l.quality_status === 'pending_review'
                              ? '#FEFAE0'
                              : '#FDE8E8',
                          color:
                            l.quality_status === 'approved'
                              ? '#1B4332'
                              : l.quality_status === 'pending_review'
                              ? '#B07D05'
                              : '#C81E1E',
                          border: `1px solid ${
                            l.quality_status === 'approved'
                              ? '#B7E4C7'
                              : l.quality_status === 'pending_review'
                              ? '#E9D8A6'
                              : '#FCA5A5'
                          }`,
                        }}
                      >
                        {l.quality_status === 'approved'
                          ? '✓ Certified & Live'
                          : l.quality_status === 'pending_review'
                          ? '⏳ Review Pending'
                          : '✕ Cert Rejected'}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(184, 227, 106, 0.3)',
                          color: '#142D25',
                          border: '1px solid #B8E36A',
                        }}
                      >
                        ✓ Quality Certified
                      </span>
                    )}

                    {/* Compatibility Badge for Public Browsing */}
                    {activeStreamType !== 'my_listings' && l.compatibility && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor:
                            l.compatibility.badge === 'suitable'
                              ? 'rgba(184, 227, 106, 0.3)'
                              : '#FFDAD6',
                          color: l.compatibility.badge === 'suitable' ? '#142D25' : '#93000A',
                          border: `1px solid ${
                            l.compatibility.badge === 'suitable' ? '#B8E36A' : '#FFDAD6'
                          }`,
                        }}
                      >
                        {l.compatibility.badge === 'suitable' ? '✓ Suitable for Furnace' : '⚠ Not Matched'}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      color: '#68756D',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#142D25' }}>
                      location_on
                    </span>
                    {l.pickup_city}, {l.pickup_state}
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontSize: '18px',
                    color: '#142D25',
                    fontWeight: 700,
                    margin: '0 0 8px 0',
                    lineHeight: 1.3,
                  }}
                >
                  {l.title}
                </h3>

                {/* Description */}
                <p
                  style={{
                    fontSize: '13px',
                    color: '#68756D',
                    lineHeight: 1.5,
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {l.description ||
                    'Verified industrial leftover stream ready for reprocessing or raw material substitution.'}
                </p>

                {/* Rejection Feedback Box if in My Listings */}
                {activeStreamType === 'my_listings' && l.quality_certificate?.reviewer_comments && (
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      marginBottom: '12px',
                      fontSize: '11px',
                      color: '#991B1B',
                    }}
                  >
                    <strong>Reviewer Note:</strong> {l.quality_certificate.reviewer_comments}
                  </div>
                )}

                {/* Processing tag */}
                {l.is_processed && (
                  <div
                    style={{
                      fontSize: '11px',
                      backgroundColor: '#F4F4EB',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '16px',
                      color: '#252D29',
                      border: '1px solid #E1E6DF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#142D25' }}>
                      precision_manufacturing
                    </span>
                    <span>
                      <strong>Declaration:</strong> {l.processing_details || 'Sorted & Treated'} (+₹
                      {l.processing_cost_per_ton}/MT)
                    </span>
                  </div>
                )}

                {/* Key Metrics Matrix */}
                <div
                  style={{
                    backgroundColor: '#F4F4EB',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #E1E6DF',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: '#68756D',
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        display: 'block',
                      }}
                    >
                      Available Lot
                    </span>
                    <strong
                      style={{
                        fontSize: '16px',
                        color: '#142D25',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {l.remaining_tons}{' '}
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#68756D' }}>MT</span>
                    </strong>
                  </div>

                  <div>
                    <span
                      style={{
                        color: '#68756D',
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        display: 'block',
                      }}
                    >
                      Floor Price
                    </span>
                    <strong
                      style={{
                        fontSize: '16px',
                        color: '#142D25',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      ₹{l.price_per_ton?.toLocaleString()}{' '}
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#68756D' }}>/MT</span>
                    </strong>
                  </div>

                  <div
                    style={{
                      gridColumn: 'span 2',
                      fontSize: '11px',
                      color: '#68756D',
                      borderTop: '1px solid #E1E6DF',
                      paddingTop: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    <span>Min Order: {l.min_order_tons} MT</span>
                    <span>{l.seller_label}</span>
                  </div>
                </div>
              </div>

              {/* Action Bottom */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #E1E6DF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                {activeStreamType === 'my_listings' ? (
                  <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'flex-end' }}>
                    {l.quality_certificate && (
                      <button
                        onClick={() =>
                          handleDownloadCertificate(
                            l.quality_certificate.id,
                            l.quality_certificate.original_filename
                          )
                        }
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          description
                        </span>
                        <span>View Certificate</span>
                      </button>
                    )}

                    {(l.quality_status === 'rejected' ||
                      l.quality_status === 'draft' ||
                      l.quality_status === 'additional_info_required') && (
                      <button
                        onClick={() => {
                          setResubmitListing(l);
                          setResubmitModalOpen(true);
                        }}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                          upload
                        </span>
                        <span>Resubmit Certificate</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#142D25',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#142D25' }}>
                        verified
                      </span>
                      Instant Freight Quote
                    </span>

                    <button
                      onClick={() => handleOpenOrder(l)}
                      className="btn-primary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                      }}
                    >
                      <span>{l.is_coming_soon ? 'Pre-Book Lot' : 'Procure / Order'}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        arrow_forward
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Order Modal ──────────────────────────────────────────────── */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        listing={selectedListing}
        onOrderSuccess={() => fetchListings()}
      />

      {/* ── Create Listing Modal ─────────────────────────────────────── */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => fetchListings()}
      />

      {/* ── Resubmit Quality Certificate Modal ──────────────────────── */}
      <ResubmitCertificateModal
        isOpen={resubmitModalOpen}
        onClose={() => {
          setResubmitModalOpen(false);
          setResubmitListing(null);
        }}
        listing={resubmitListing}
        onResubmitted={() => fetchListings()}
      />
    </div>
  );
};

export default MarketplacePage;
