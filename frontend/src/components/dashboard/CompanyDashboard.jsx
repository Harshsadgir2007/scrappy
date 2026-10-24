import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../common/StatusBadge';

const CompanyDashboard = () => {
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const isVerified = company?.verification_status === 'verified';

  const formatProducts = (products) => {
    if (!products) return ['Steel Billets (IS 2830)', 'Fe 550D TMT Rebars', 'Secondary Castings'];
    if (Array.isArray(products)) {
      return products.length > 0 ? products : ['Steel Billets (IS 2830)', 'Fe 550D TMT Rebars'];
    }
    if (typeof products === 'string') {
      try {
        const parsed = JSON.parse(products);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
      const split = products.split(',').map((p) => p.trim()).filter(Boolean);
      if (split.length > 0) return split;
    }
    return ['Steel Billets (IS 2830)', 'Fe 550D TMT Rebars'];
  };

  const declaredProductsList = formatProducts(company?.declared_products);

  // Recent cluster trades feed
  const clusterTrades = [
    {
      id: 'LOT-HZ-8834',
      grade: 'HMS-1 Heavy Structural (6mm+)',
      origin: 'Hazira Re-Rolling Mill #4',
      tonnage: '180 MT',
      floor: '₹36,200/MT',
      status: 'Ready for Dispatch',
      statusClass: 'pill-lime',
    },
    {
      id: 'LOT-SL-4109',
      grade: 'Blast Furnace Slag (Grade B)',
      origin: 'Western Integrated Smelter',
      tonnage: '420 MT',
      floor: '₹2,450/MT',
      status: 'In Escrow Lock',
      statusClass: 'pill-neutral',
    },
    {
      id: 'LOT-MS-9022',
      grade: 'Mill Scale High-Fe (68% Fe)',
      origin: 'Corridor Steel & Forging',
      tonnage: '95 MT',
      floor: '₹14,800/MT',
      status: 'Weighbridge Calibrated',
      statusClass: 'pill-dark',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── 1. Top Welcome & Industrial Authorization Banner ─────────────── */}
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
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <StatusBadge status={company?.verification_status || 'verified'} />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  backgroundColor: '#EEEEE5',
                  color: '#68756D',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#142D25' }}>
                  factory
                </span>
                Hazira-Surat Industrial Corridor • Cycle Q2
              </span>
            </div>

            <h1
              style={{
                fontSize: '28px',
                color: '#142D25',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                margin: '4px 0 6px',
              }}
            >
              Welcome, {user?.full_name || 'Enterprise Operator'}
            </h1>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
                fontSize: '13px',
                color: '#68756D',
              }}
            >
              <span>
                Enterprise Account:{' '}
                <strong style={{ color: '#252D29', fontWeight: 600 }}>
                  {company?.name || 'GreenSteel Industries Pvt Ltd'}
                </strong>
              </span>
              <span>•</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#EEEEE5',
                  color: '#252D29',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                Sector: {company?.industry || 'Secondary Metallurgy & Re-rolling'}
              </span>
            </div>
          </div>

          {/* Quick Action Cluster Status Indicator */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#B8E36A',
                }}
              />
              <span style={{ color: '#68756D' }}>Cluster Liquidity:</span>
              <strong style={{ color: '#142D25' }}>High (84 MT/day)</strong>
            </div>
            <span style={{ fontSize: '11px', color: '#68756D', fontFamily: 'JetBrains Mono, monospace' }}>
              Last synced 2 mins ago
            </span>
          </div>
        </div>

        {/* Dual-Access Capability Callout */}
        <div
          style={{
            marginTop: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#F4F4EB',
            border: '1px solid #E1E6DF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                backgroundColor: '#B8E36A',
                color: '#142D25',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span style={{ fontSize: '13px', color: '#252D29', fontWeight: 500 }}>
              <strong>Single Account Protocol:</strong> Full bilateral access to list manufacturing by-products and
              procure verified secondary feedstocks.
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: '#142D25',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            <span>Policy v2.4 Compliant</span>
            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#142D25' }}>
              verified_user
            </span>
          </div>
        </div>
      </section>

      {/* Verification Prompt (if not verified) */}
      {!isVerified && (
        <section
          style={{
            backgroundColor: '#FFF3CD',
            border: '1px solid #FFEBAA',
            borderLeft: '5px solid #142D25',
            padding: '20px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h3 style={{ color: '#856404', margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700 }}>
              Action Required: Upload Business License for Instant Industrial Verification
            </h3>
            <p style={{ color: '#856404', fontSize: '13px', margin: 0, lineHeight: 1.4 }}>
              Upload your factory license, GST registration, or PCB consent certificate to activate full bilateral
              scrap listings and trade settlements.
            </p>
          </div>
          <Link to="/profile" className="btn-dark" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Upload Business License Now →
          </Link>
        </section>
      )}

      {/* ── 2. Primary Action Cards: Sell & Procure ──────────────────────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Card 1: Sell Waste & By-Products */}
        <div
          className="scrappy-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '28px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#142D25',
                  color: '#FAFBF7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  recycling
                </span>
              </div>
              <span
                className="pill pill-lime"
                style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#142D25' }} />
                Ready to Dispatch
              </span>
            </div>

            <h2 style={{ fontSize: '20px', color: '#142D25', fontWeight: 800, marginBottom: '8px' }}>
              Sell Waste & By-Products
            </h2>
            <p style={{ color: '#68756D', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              List industrial scrap, leftover materials, and production by-products. Set dynamic floor pricing,
              metallurgical declarations, and review cluster-matched procurement bids.
            </p>

            {/* Quick Listing Stream Chips */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}
              >
                Eligible Streams for Quick-Listing:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E1E6DF',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#252D29',
                  }}
                >
                  Steel Slag (Grade B)
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E1E6DF',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#252D29',
                  }}
                >
                  Mill Scale High-Fe
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E1E6DF',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#252D29',
                  }}
                >
                  Billet Cut-offs (120mm)
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/marketplace"
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '8px',
              }}
            >
              <span>Open Marketplace to List Scrap</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                arrow_forward
              </span>
            </Link>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#68756D',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#142D25' }}>
                  tune
                </span>
                Post listings with verified cost floors & declarations
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>Fee: 0% intra-cluster</span>
            </div>
          </div>
        </div>

        {/* Card 2: Procure Raw Materials */}
        <div
          className="scrappy-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '28px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#001811',
                  color: '#B8E36A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  input_circle
                </span>
              </div>
              <span
                className="pill pill-neutral"
                style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}
              >
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#B8E36A' }} />
                14 Nearby Stream Matches
              </span>
            </div>

            <h2 style={{ fontSize: '20px', color: '#142D25', fontWeight: 800, marginBottom: '8px' }}>
              Procure Raw Materials
            </h2>
            <p style={{ color: '#68756D', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
              Source lower-cost secondary raw materials matching your declared manufacturing outputs. Run real-time
              chemical compatibility checks and calculate landed transit costs across western corridor nodes.
            </p>

            {/* Top Cluster Availability Chips */}
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}
              >
                Top Cluster Availability Right Now:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E1E6DF',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#252D29',
                  }}
                >
                  HMS 1/2 Melting Scrap (120 MT)
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E1E6DF',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#252D29',
                  }}
                >
                  Sponge Iron Fines (80 MT)
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(184, 227, 106, 0.25)',
                    border: '1px solid rgba(184, 227, 106, 0.5)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#142D25',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  Avg 14% below spot
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              to="/marketplace"
              className="btn-dark"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                borderRadius: '8px',
              }}
            >
              <span>Explore Available Material Streams</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#B8E36A' }}>
                search_insights
              </span>
            </Link>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#68756D',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#142D25' }}>
                  local_shipping
                </span>
                Partial-quantity splits allowed • Real-time freight quote
              </span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#142D25',
                }}
              >
                94.8% Match Index
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Supporting Cards: Facility Outputs & Standard Catalog ─────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Card 3: Company Facility & Outputs */}
        <div
          className="scrappy-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#142D25' }}>
                  domain_verification
                </span>
                <h3 style={{ fontSize: '16px', color: '#142D25', fontWeight: 700 }}>
                  Company Facility & Outputs
                </h3>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#EEEEE5',
                  color: '#68756D',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                }}
              >
                {company?.city ? `${company.city} Unit` : 'Active Hub Node'}
              </span>
            </div>

            <p style={{ color: '#68756D', fontSize: '13px', lineHeight: 1.5, marginBottom: '14px' }}>
              Declared outputs calibrate your autonomous matching index for incoming furnace feeds and scrap tenders.
              Ensure certifications stay current.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Registered Products & Secondary Output Capability:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {declaredProductsList.map((product, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#EEEEE5',
                      color: '#142D25',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#142D25',
                      }}
                    />
                    {product}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <div>
                <span style={{ color: '#68756D' }}>Cluster Plant ID: </span>
                <strong style={{ color: '#142D25' }}>
                  {company?.id ? `CP-WST-${String(company.id).padStart(4, '0')}` : 'CP-WST-0042'}
                </strong>
              </div>
              <div>
                <span style={{ color: '#68756D' }}>Pollution NOC: </span>
                <strong style={{ color: '#142D25' }}>Active (Audited)</strong>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <Link
              to="/profile"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#142D25',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>Manage Profile & Documents</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </Link>
          </div>
        </div>

        {/* Card 4: Standard Material Catalog */}
        <div
          className="scrappy-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#142D25' }}>
                  menu_book
                </span>
                <h3 style={{ fontSize: '16px', color: '#142D25', fontWeight: 700 }}>
                  Standard Material Catalog
                </h3>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#EEEEE5',
                  color: '#68756D',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                }}
              >
                Taxonomy v4.2
              </span>
            </div>

            <p style={{ color: '#68756D', fontSize: '13px', lineHeight: 1.5, marginBottom: '14px' }}>
              All material valuations, density metrics, and settlements are strictly indexed in{' '}
              <strong style={{ color: '#252D29' }}>metric tons (MT)</strong> adhering to the national circular
              taxonomy.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Cluster Standardized Scrap Taxonomies:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#EEEEE5',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
                    IS:2549
                  </span>
                  <span style={{ color: '#142D25', fontWeight: 600 }}>Heavy Melting Scrap (HMS 1/2)</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#EEEEE5',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
                    IS:1320
                  </span>
                  <span style={{ color: '#142D25', fontWeight: 600 }}>Shredded Steel Grade 211</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#EEEEE5',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
                    CPCB:MET
                  </span>
                  <span style={{ color: '#142D25', fontWeight: 600 }}>Granulated Slag Fines</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#F4F4EB',
                border: '1px solid #E1E6DF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#252D29' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#142D25' }}>
                  balance
                </span>
                Mandatory weighbridge calibration
              </span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#68756D',
                }}
              >
                1 MT = 1000 KG
              </span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <Link
              to="/materials"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#142D25',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>Open Material Directory</span>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Circular Performance & Material Velocity Telemetry ────────── */}
      <section className="scrappy-card" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#142D25',
              }}
            />
            <h3 style={{ fontSize: '16px', color: '#142D25', fontWeight: 800 }}>
              Circular Performance & Material Velocity — Cluster Node
            </h3>
          </div>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#68756D',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          >
            Active Cycle: 30-Day Cumulative
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Metric 1: Re-circulated */}
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Material Re-Circulated
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#142D25' }}>
                autorenew
              </span>
            </div>
            <div style={{ margin: '14px 0 6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '36px',
                  color: '#142D25',
                  fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                420
              </span>
              <span style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#68756D' }}>
                MT
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#68756D',
              }}
            >
              <span style={{ color: '#142D25', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                +18% vs prev cycle
              </span>
              <span>Direct furnace feed</span>
            </div>
            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '9999px',
                backgroundColor: '#EEEEE5',
                marginTop: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '74%',
                  height: '100%',
                  borderRadius: '9999px',
                  backgroundColor: '#B8E36A',
                }}
              />
            </div>
          </div>

          {/* Metric 2: Savings */}
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Secondary Sourcing Savings
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#142D25' }}>
                savings
              </span>
            </div>
            <div style={{ margin: '14px 0 6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '36px',
                  color: '#142D25',
                  fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                ₹14.2
              </span>
              <span style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#68756D' }}>
                Lakhs
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#68756D',
              }}
            >
              <span style={{ color: '#142D25', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                -11.4% landed cost
              </span>
              <span>Intra-cluster logistics</span>
            </div>
            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '9999px',
                backgroundColor: '#EEEEE5',
                marginTop: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '82%',
                  height: '100%',
                  borderRadius: '9999px',
                  backgroundColor: '#B8E36A',
                }}
              />
            </div>
          </div>

          {/* Metric 3: Chemistry Match Rate */}
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#68756D',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                Metallurgical Match Index
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#142D25' }}>
                science
              </span>
            </div>
            <div style={{ margin: '14px 0 6px', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '36px',
                  color: '#142D25',
                  fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                94.8
              </span>
              <span style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: '#68756D' }}>
                %
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#68756D',
              }}
            >
              <span style={{ color: '#142D25', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                High compatibility
              </span>
              <span>Assay tolerance ±0.2%</span>
            </div>
            {/* Progress bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '9999px',
                backgroundColor: '#EEEEE5',
                marginTop: '12px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '95%',
                  height: '100%',
                  borderRadius: '9999px',
                  backgroundColor: '#B8E36A',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Active Cluster Scrap Trades Telemetry Table ───────────────── */}
      <section className="scrappy-card" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '16px', color: '#142D25', fontWeight: 800 }}>
              Active Cluster Scrap Trades & Live Inbound Quotes
            </h3>
            <p style={{ fontSize: '12px', color: '#68756D', margin: '2px 0 0' }}>
              Real-time trade telemetry directly affecting your cluster procurement queue
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/orders" className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                sync_alt
              </span>
              <span>View All Trades</span>
            </Link>
            <Link to="/marketplace" className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                add_circle
              </span>
              <span>New Listing</span>
            </Link>
          </div>
        </div>

        <div className="scrappy-table-wrapper">
          <table className="scrappy-table">
            <thead>
              <tr>
                <th>Stream ID</th>
                <th>Material Grade</th>
                <th>Origin Enterprise</th>
                <th style={{ textAlign: 'right' }}>Available Lot</th>
                <th style={{ textAlign: 'right' }}>Cluster Floor</th>
                <th>Dispatch Status</th>
              </tr>
            </thead>
            <tbody>
              {clusterTrades.map((trade) => (
                <tr key={trade.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#142D25' }}>
                    {trade.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{trade.grade}</td>
                  <td style={{ color: '#68756D' }}>{trade.origin}</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: '#142D25',
                    }}
                  >
                    {trade.tonnage}
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      color: '#252D29',
                    }}
                  >
                    {trade.floor}
                  </td>
                  <td>
                    <span
                      className={`pill ${trade.statusClass}`}
                      style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default CompanyDashboard;
