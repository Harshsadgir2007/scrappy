import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';

const PRIMARY_CATEGORIES = [
  {
    id: 'steel scrap',
    name: 'Steel Scrap',
    icon: '🔩',
    desc: 'Heavy melting scrap, structural off-cuts, turnings & plate trimmings',
    defaultMaterialName: 'Metal scrap',
  },
  {
    id: 'fly ash',
    name: 'Fly Ash',
    icon: '💨',
    desc: 'Class F & C pozzolanic ash from power generation for cement & concrete',
    defaultMaterialName: 'Fly ash',
  },
  {
    id: 'textile waste',
    name: 'Textile Waste',
    icon: '🧵',
    desc: 'Baled combed cotton lint, yarn cut pieces & post-industrial fiber scrap',
    defaultMaterialName: 'Textile waste',
  },
  {
    id: 'by_product',
    name: 'Industrial By-Product',
    icon: '🏭',
    desc: 'Chemical by-products, furnace slag, foundry sand & secondary minerals',
    defaultMaterialName: 'Fly ash',
  },
  {
    id: 'scrap',
    name: 'General Production Scrap',
    icon: '📦',
    desc: 'Manufacturing overruns, defect components & raw material leftovers',
    defaultMaterialName: 'Metal scrap',
  },
];

const StepByStepListingModal = ({ isOpen, onClose, onCreated, initialData = null }) => {
  const { company } = useAuth();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  const [materials, setMaterials] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [category, setCategory] = useState('steel scrap');
  const [materialId, setMaterialId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Quantity
  const [totalTons, setTotalTons] = useState('');
  const [minOrderTons, setMinOrderTons] = useState('5.0');
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');

  // Step 3: Actual Cost
  const [actualCostPerTon, setActualCostPerTon] = useState('');
  const [minPriceFloor, setMinPriceFloor] = useState('');

  // Step 4: Processed Cost
  const [isProcessed, setIsProcessed] = useState(false);
  const [processingDetails, setProcessingDetails] = useState('');
  const [processedCostPerTon, setProcessedCostPerTon] = useState('');

  // Step 5: Transport Cost & Tolls
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupPincode, setPickupPincode] = useState('');
  const [freightRatePerTonKm, setFreightRatePerTonKm] = useState('3.5');
  const [tollEstimate, setTollEstimate] = useState('500');
  const [syncToInventory, setSyncToInventory] = useState(true);

  // Load master catalog
  useEffect(() => {
    if (isOpen) {
      api.get('/materials')
        .then((res) => {
          setMaterials(res.data);
          // Set initial default material
          if (!materialId && res.data.length > 0) {
            const defaultMat = res.data.find((m) => m.name.toLowerCase().includes('metal')) || res.data[0];
            setMaterialId(defaultMat.id);
          }
        })
        .catch(() => {});

      if (initialData) {
        setCategory(initialData.category || 'steel scrap');
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setTotalTons(initialData.quantity_tons || initialData.total_tons || '');
        setActualCostPerTon(initialData.actual_cost_per_ton || initialData.price_per_ton || '');
        setMinPriceFloor(initialData.actual_cost_per_ton ? (initialData.actual_cost_per_ton * 0.9).toFixed(0) : '');
        setIsProcessed(!!initialData.is_processed);
        setProcessingDetails(initialData.processing_details || '');
        setProcessedCostPerTon(initialData.processed_cost_per_ton || '');
        setPickupCity(initialData.city || company?.city || '');
        setPickupState(initialData.state || company?.state || '');
        setPickupAddress(initialData.storage_location || company?.address || '');
      } else if (company) {
        setPickupAddress(company.address || '');
        setPickupCity(company.city || '');
        setPickupState(company.state || '');
        setPickupPincode(company.pincode || '');
      }
      setCurrentStep(1);
    }
  }, [isOpen, company, initialData]);

  // When category changes, auto-match material from catalog if possible
  const handleCategorySelect = (catId) => {
    setCategory(catId);
    const catConfig = PRIMARY_CATEGORIES.find((c) => c.id === catId);
    if (catConfig && materials.length > 0) {
      const match = materials.find((m) =>
        m.name.toLowerCase().includes(catConfig.defaultMaterialName.toLowerCase()) ||
        catConfig.defaultMaterialName.toLowerCase().includes(m.name.toLowerCase())
      );
      if (match) {
        setMaterialId(match.id);
        if (!title || title.includes('Scrap') || title.includes('Ash') || title.includes('Waste')) {
          setTitle(`Premium ${catConfig.name} - Batch Lot`);
        }
      }
    }
  };

  // Calculations for Step 6 Review
  const parsedTons = parseFloat(totalTons) || 0;
  const parsedActualCost = parseFloat(actualCostPerTon) || 0;
  const parsedProcessedCost = isProcessed ? parseFloat(processedCostPerTon) || 0 : 0;
  const parsedToll = parseFloat(tollEstimate) || 0;
  const totalBaseMaterialValuation = parsedTons * parsedActualCost;
  const totalProcessingCost = parsedTons * parsedProcessedCost;
  const effectiveBaseCostPerTon = parsedActualCost + parsedProcessedCost;

  // Validation per step
  const validateStep = (step) => {
    if (step === 1) {
      if (!category) {
        addToast('Please select a material category', 'warning');
        return false;
      }
      if (!materialId) {
        addToast('Please choose a material from the master catalog', 'warning');
        return false;
      }
      if (!title.trim()) {
        addToast('Please enter a listing title', 'warning');
        return false;
      }
    }
    if (step === 2) {
      if (!totalTons || parsedTons <= 0) {
        addToast('Please enter a valid total quantity in tons', 'warning');
        return false;
      }
      if (isComingSoon && !expectedDate) {
        addToast('Please provide an expected availability date', 'warning');
        return false;
      }
    }
    if (step === 3) {
      if (!actualCostPerTon || parsedActualCost <= 0) {
        addToast('Please enter the actual base cost / asking price per ton', 'warning');
        return false;
      }
      if (!minPriceFloor) {
        addToast('Please specify a minimum price floor', 'warning');
        return false;
      }
      if (parseFloat(actualCostPerTon) < parseFloat(minPriceFloor)) {
        addToast('Price per ton cannot be lower than the minimum price floor', 'warning');
        return false;
      }
    }
    if (step === 4) {
      if (isProcessed) {
        if (!processingDetails.trim()) {
          addToast('Please declare the processing steps performed (e.g. baled, shredded)', 'warning');
          return false;
        }
        if (parsedProcessedCost < 0) {
          addToast('Processed cost per ton cannot be negative', 'warning');
          return false;
        }
      }
    }
    if (step === 5) {
      if (!pickupCity.trim() || !pickupState.trim()) {
        addToast('Please provide pickup city and state', 'warning');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    try {
      setSubmitting(true);
      const payload = {
        material_id: parseInt(materialId),
        category: category,
        title: title,
        description: description,
        total_tons: parsedTons,
        price_per_ton: parsedActualCost,
        min_price_floor: parseFloat(minPriceFloor) || parsedActualCost,
        min_order_tons: parseFloat(minOrderTons) || 1.0,
        is_processed: isProcessed,
        processing_details: isProcessed ? processingDetails : null,
        processing_cost_per_ton: parsedProcessedCost,
        pickup_address: pickupAddress,
        pickup_city: pickupCity,
        pickup_state: pickupState,
        pickup_pincode: pickupPincode,
        freight_rate_per_ton_km: parseFloat(freightRatePerTonKm) || 3.5,
        toll_estimate: parsedToll,
        is_coming_soon: isComingSoon,
        expected_available_date: isComingSoon && expectedDate ? new Date(expectedDate).toISOString() : null,
      };

      await api.post('/listings', payload);

      // Optionally record in physical inventory
      if (syncToInventory) {
        try {
          await api.post('/inventory', {
            material_id: parseInt(materialId),
            material_name: materials.find((m) => m.id === parseInt(materialId))?.name || title,
            category: category,
            title: title,
            description: description,
            quantity_tons: parsedTons,
            actual_cost_per_ton: parsedActualCost,
            is_processed: isProcessed,
            processing_details: isProcessed ? processingDetails : null,
            processed_cost_per_ton: parsedProcessedCost,
            storage_location: pickupAddress || `${company?.name || 'Factory'} Yard`,
            city: pickupCity,
            state: pickupState,
            pincode: pickupPincode,
            freight_rate_per_ton_km: parseFloat(freightRatePerTonKm) || 3.5,
            estimated_tolls: parsedToll,
            notes: 'Listed on Marketplace Exchange.',
          });
        } catch {
          // Non-blocking if already exists
        }
      }

      addToast(`Material "${title}" successfully listed on Scrappy Marketplace!`, 'success');
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to publish material listing', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [
    'Category',
    'Quantity',
    'Actual Cost',
    'Processed Cost',
    'Transport & Tolls',
    'Review & Publish',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="List Industrial Material & By-Product (Guided Step-by-Step)"
      maxWidth="800px"
    >
      <div>
        {/* Stepper Progress Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {stepLabels.map((lbl, idx) => {
              const stepNum = idx + 1;
              const isActive = stepNum === currentStep;
              const isPast = stepNum < currentStep;
              return (
                <div
                  key={lbl}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flex: 1,
                    cursor: isPast ? 'pointer' : 'default',
                  }}
                  onClick={() => isPast && setCurrentStep(stepNum)}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isActive ? '#2D6A4F' : isPast ? '#52B788' : '#E9ECEF',
                      color: isActive || isPast ? '#fff' : '#6C757D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isPast ? '✓' : stepNum}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#1B4332' : isPast ? '#2D6A4F' : '#6C757D',
                      textAlign: 'center',
                    }}
                  >
                    {lbl}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ height: '4px', backgroundColor: '#E9ECEF', borderRadius: '2px', position: 'relative' }}>
            <div
              style={{
                height: '100%',
                backgroundColor: '#2D6A4F',
                borderRadius: '2px',
                width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* STEP 1: CATEGORY & MATERIAL */}
        {currentStep === 1 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1B4332', marginTop: 0, marginBottom: '6px' }}>
              Step 1: Choose Category of Material
            </h3>
            <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '18px' }}>
              Select the primary classification of the material you wish to list on the circular exchange:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {PRIMARY_CATEGORIES.map((cat) => {
                const selected = category === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: selected ? '2px solid #2D6A4F' : '1px solid #CED4DA',
                      backgroundColor: selected ? '#F0FFF4' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{cat.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: selected ? '#1B4332' : '#212529', marginBottom: '4px' }}>
                      {cat.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6C757D', lineHeight: '1.3' }}>
                      {cat.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Catalog Material Reference *
                </label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CED4DA', background: '#fff' }}
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Listing Title / Lot Name *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Heavy Melting Steel Scrap HMS-1"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Description & Material Specifications
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Declare dimensions, purity percentage, moisture levels, or storage conditions..."
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CED4DA', fontSize: '13px' }}
              />
            </div>
          </div>
        )}

        {/* STEP 2: QUANTITY & SPECS */}
        {currentStep === 2 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1B4332', marginTop: 0, marginBottom: '6px' }}>
              Step 2: Declare Quantity & Lot Availability
            </h3>
            <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '18px' }}>
              Specify available tonnage and allowed order partitioning for industrial buyers:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Total Metric Tons Available *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.5"
                    value={totalTons}
                    onChange={(e) => setTotalTons(e.target.value)}
                    placeholder="e.g. 100"
                    style={{ width: '100%', padding: '9px 40px 9px 12px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#6C757D', fontSize: '12px', fontWeight: 600 }}>
                    Tons
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block', marginTop: '4px' }}>
                  Total lot size offered for sale on the platform.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Minimum Partial Order Quantity (Tons) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    value={minOrderTons}
                    onChange={(e) => setMinOrderTons(e.target.value)}
                    placeholder="e.g. 5"
                    style={{ width: '100%', padding: '9px 40px 9px 12px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                  />
                  <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#6C757D', fontSize: '12px', fontWeight: 600 }}>
                    Tons
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block', marginTop: '4px' }}>
                  Buyers may purchase variable chunks as long as they meet this minimum.
                </span>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: '#FFF9DB', borderRadius: '8px', border: '1px solid #FFE066' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#856404' }}>
                <input
                  type="checkbox"
                  checked={isComingSoon}
                  onChange={(e) => setIsComingSoon(e.target.checked)}
                />
                📅 Upcoming Generation Batch (Pre-Booking Stream)
              </label>
              {isComingSoon && (
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Expected Ready / Availability Date *
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: ACTUAL COST */}
        {currentStep === 3 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1B4332', marginTop: 0, marginBottom: '6px' }}>
              Step 3: Define Actual Base Cost
            </h3>
            <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '18px' }}>
              Declare your raw scrap/by-product cost and the minimum reservation floor:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Actual Base Price (₹ / Metric Ton) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#6C757D', fontWeight: 600 }}>₹</span>
                  <input
                    type="number"
                    step="50"
                    value={actualCostPerTon}
                    onChange={(e) => setActualCostPerTon(e.target.value)}
                    placeholder="e.g. 28000"
                    style={{ width: '100%', padding: '9px 12px 9px 28px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block', marginTop: '4px' }}>
                  Standard listed selling price per ton.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Minimum Price Floor (₹ / Metric Ton) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#6C757D', fontWeight: 600 }}>₹</span>
                  <input
                    type="number"
                    step="50"
                    value={minPriceFloor}
                    onChange={(e) => setMinPriceFloor(e.target.value)}
                    placeholder="e.g. 25000"
                    style={{ width: '100%', padding: '9px 12px 9px 28px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block', marginTop: '4px' }}>
                  Lowest acceptable counter-offer threshold.
                </span>
              </div>
            </div>

            {parsedActualCost > 0 && parsedTons > 0 && (
              <div style={{ padding: '14px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#495057' }}>Estimated Base Raw Material Valuation:</span>
                  <strong style={{ color: '#1B4332', fontSize: '15px' }}>
                    ₹{totalBaseMaterialValuation.toLocaleString()}
                  </strong>
                </div>
                <div style={{ fontSize: '11px', color: '#6C757D', marginTop: '4px' }}>
                  ({parsedTons} Tons × ₹{parsedActualCost.toLocaleString()} / Ton)
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: PROCESSED COST */}
        {currentStep === 4 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1B4332', marginTop: 0, marginBottom: '6px' }}>
              Step 4: Processed Cost (If Processed)
            </h3>
            <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '18px' }}>
              Has this material undergone value-add conditioning, sorting, baling, shredding, or treatment?
            </p>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: !isProcessed ? '2px solid #2D6A4F' : '1px solid #CED4DA',
                backgroundColor: !isProcessed ? '#F0FFF4' : '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}>
                <input
                  type="radio"
                  name="processedToggle"
                  checked={!isProcessed}
                  onChange={() => {
                    setIsProcessed(false);
                    setProcessedCostPerTon('0');
                    setProcessingDetails('');
                  }}
                />
                Unprocessed / Raw Stream (₹0 Processing Cost)
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: isProcessed ? '2px solid #2D6A4F' : '1px solid #CED4DA',
                backgroundColor: isProcessed ? '#F0FFF4' : '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}>
                <input
                  type="radio"
                  name="processedToggle"
                  checked={isProcessed}
                  onChange={() => setIsProcessed(true)}
                />
                Processed / Conditioned Material
              </label>
            </div>

            {isProcessed && (
              <div style={{ padding: '18px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E9ECEF' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Processing Method / Treatment Description *
                    </label>
                    <input
                      type="text"
                      value={processingDetails}
                      onChange={(e) => setProcessingDetails(e.target.value)}
                      placeholder="e.g. Hydraulically baled, magnetically separated, moisture-extracted"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                      Processing Cost (₹ / Ton) *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#6C757D', fontWeight: 600 }}>₹</span>
                      <input
                        type="number"
                        step="50"
                        value={processedCostPerTon}
                        onChange={(e) => setProcessedCostPerTon(e.target.value)}
                        placeholder="e.g. 1200"
                        style={{ width: '100%', padding: '9px 12px 9px 28px', borderRadius: '6px', border: '1px solid #CED4DA' }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#2D6A4F', fontWeight: 600 }}>
                  ✓ Processing fee will be itemized separately on the buyer landed cost invoice.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: TRANSPORT COST & TOLLS */}
        {currentStep === 5 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1B4332', marginTop: 0, marginBottom: '6px' }}>
              Step 5: Transport Cost & Highway Toll Parameters
            </h3>
            <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '18px' }}>
              Define pickup location, freight rate per ton-km, and estimated toll levies:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Pickup Facility / Yard City *
                </label>
                <input
                  type="text"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder="e.g. Pune"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  State *
                </label>
                <input
                  type="text"
                  value={pickupState}
                  onChange={(e) => setPickupState(e.target.value)}
                  placeholder="e.g. Maharashtra"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  PIN Code
                </label>
                <input
                  type="text"
                  value={pickupPincode}
                  onChange={(e) => setPickupPincode(e.target.value)}
                  placeholder="e.g. 411026"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Pickup Address / Gate Location
              </label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="Plot / Gate number (kept confidential until order approval)"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Freight Rate (₹ / Ton / Km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={freightRatePerTonKm}
                  onChange={(e) => setFreightRatePerTonKm(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block', marginTop: '4px' }}>
                  Standard multi-axle carrier rate (Default ₹3.50/ton-km).
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Estimated Highway Tolls (₹ / Load)
                </label>
                <input
                  type="number"
                  step="50"
                  value={tollEstimate}
                  onChange={(e) => setTollEstimate(e.target.value)}
                  placeholder="e.g. 500"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
                />
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block', marginTop: '4px' }}>
                  FASTag highway toll estimate added to the landed bill.
                </span>
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#E8F5E9', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#1B4332' }}>
                <input
                  type="checkbox"
                  checked={syncToInventory}
                  onChange={(e) => setSyncToInventory(e.target.checked)}
                />
                📦 Automatically record and manage this lot in my physical Warehouse Inventory
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {currentStep === 6 && (
          <div>
            <h3 style={{ fontSize: '16px', color: '#1B4332', marginTop: 0, marginBottom: '6px' }}>
              Step 6: Review Landed Cost Breakdown & Publish
            </h3>
            <p style={{ fontSize: '13px', color: '#6C757D', marginBottom: '18px' }}>
              Review the complete one-by-one breakdown before broadcasting live to verified buyers:
            </p>

            <div style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #2D6A4F',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              <div style={{ backgroundColor: '#2D6A4F', color: '#fff', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{title}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    Category: <strong>{category.toUpperCase()}</strong> | Pickup: {pickupCity}, {pickupState}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{parsedTons} Tons</div>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>Min: {minOrderTons} Tons</div>
                </div>
              </div>

              <div style={{ padding: '18px' }}>
                <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                      <td style={{ padding: '8px 0', color: '#495057' }}>1. Actual Base Material Price:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                        ₹{parsedActualCost.toLocaleString()} / Ton
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                      <td style={{ padding: '8px 0', color: '#495057' }}>2. Processed Cost (Conditioning):</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: isProcessed ? '#2D6A4F' : '#6C757D' }}>
                        {isProcessed ? `₹${parsedProcessedCost.toLocaleString()} / Ton (${processingDetails})` : '₹0 / Ton (Raw)'}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                      <td style={{ padding: '8px 0', color: '#495057' }}>3. Freight Transport Benchmark:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                        ₹{freightRatePerTonKm} / Ton-Km
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E9ECEF' }}>
                      <td style={{ padding: '8px 0', color: '#495057' }}>4. Estimated Highway Tolls:</td>
                      <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
                        ₹{parsedToll.toLocaleString()}
                      </td>
                    </tr>
                    <tr style={{ backgroundColor: '#F8F9FA' }}>
                      <td style={{ padding: '12px 0', fontWeight: 700, color: '#1B4332', fontSize: '14px' }}>
                        Combined Unit Ex-Works Rate:
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 800, color: '#1B4332', fontSize: '16px' }}>
                        ₹{effectiveBaseCostPerTon.toLocaleString()} / Ton
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ padding: '12px 16px', backgroundColor: '#E8F5E9', borderRadius: '6px', fontSize: '12px', color: '#1B4332', lineHeight: '1.4' }}>
              🛡️ <strong>Identity Protection Active:</strong> Your corporate name and exact gate address remain anonymous until you accept an incoming purchase request.
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E9ECEF' }}>
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#F8F9FA',
                  border: '1px solid #CED4DA',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '9px 18px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#6C757D',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Cancel
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                style={{
                  padding: '9px 24px',
                  backgroundColor: '#2D6A4F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '9px 28px',
                  backgroundColor: '#1B4332',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(27,67,50,0.3)',
                }}
              >
                {submitting ? 'Publishing...' : '🚀 Publish Material Listing'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StepByStepListingModal;
