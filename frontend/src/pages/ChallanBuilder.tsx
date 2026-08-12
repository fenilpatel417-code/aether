import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, Trash2, Save, FileCheck2, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { API_BASE_URL } from '../config';

interface Customer {
  id: string;
  name: string;
  businessName: string;
  status: string;
  address?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  currentStock: number;
  location: string;
}

interface SelectedItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

const ChallanBuilder: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Seeding lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [challanStatus, setChallanStatus] = useState<'Draft' | 'Confirmed'>('Draft');
  const [items, setItems] = useState<SelectedItem[]>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/customers?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/products?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!custRes.ok || !prodRes.ok) {
          throw new Error('Failed to retrieve core customers/products setup catalogs');
        }

        const custData = await custRes.json();
        const prodData = await prodRes.json();

        // Only display active customers for billing
        setCustomers(custData.customers.filter((c: Customer) => c.status === 'Active'));
        setProducts(prodData.products);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return; // Must keep at least 1 row
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof SelectedItem, value: string | number) => {
    const newItems = [...items];
    
    if (field === 'productId') {
      const prodId = value as string;
      newItems[index].productId = prodId;
      
      // Auto-prefill the default unit price
      const selectedProd = products.find(p => p.id === prodId);
      newItems[index].unitPrice = selectedProd ? selectedProd.unitPrice : 0;
    } else {
      newItems[index][field] = value as never;
    }

    setItems(newItems);
  };

  // Calculations
  const calculatedGrandTotal = items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);

  const calculatedTotalQty = items.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setSaveError('Please select a customer.');
      return;
    }

    // Verify all rows have a product selected
    for (const item of items) {
      if (!item.productId) {
        setSaveError('Please select a product for all rows.');
        return;
      }
    }

    // Client-side stock check for Confirmed challans
    if (challanStatus === 'Confirmed') {
      for (const item of items) {
        const prod = products.find(p => p.id === item.productId)!;
        if (prod.currentStock < item.quantity) {
          setSaveError(`Insufficient stock for product '${prod.name}'. Available: ${prod.currentStock}, Requested: ${item.quantity}. Either adjust quantities or save as Draft.`);
          return;
        }
      }
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      customerId: selectedCustomerId,
      status: challanStatus,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/challans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate challan');
      }

      showToast(
        `Commercial Sales Challan ${data.challanNumber} issued successfully`,
        'success'
      );
      navigate('/challans');
    } catch (err: any) {
      setSaveError(err.message);
      showToast(err.message || 'Failed to save Challan details', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Initializing challan builder forms...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: 'red' }}>Error loading builder: {error}</div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header back button */}
      <div>
        <Link to="/challans" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={16} />
          <span>Back to Challans list</span>
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <div className="page-title-section">
          <h1 className="page-title">Create Sales Challan</h1>
          <p className="page-subtitle">Compile line items, check real-time stock levels, and issue invoices</p>
        </div>
      </div>

      {saveError && <div className="login-err">{saveError}</div>}

      <form onSubmit={handleFormSubmit}>
        <div className="challan-builder-grid">
          
          {/* Left Panel: Customer selection & Items builder table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Primary Details card */}
            <div className="card-widget">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Customer / Debtor (Active Only)</label>
                  <select 
                    className="form-select"
                    required
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">-- Select Billing Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.businessName})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Invoice Status</label>
                  <select 
                    className="form-select"
                    value={challanStatus}
                    onChange={(e) => setChallanStatus(e.target.value as any)}
                  >
                    <option value="Draft">Draft (Lock Stock Later)</option>
                    <option value="Confirmed">Confirmed (Reduce Stock Now)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line items builder card */}
            <div className="card-widget">
              <span className="widget-title" style={{ borderBottom: 'none', padding: 0 }}>
                Challan Line Items
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Header Labels */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.2fr 1fr 1.2fr 140px',
                  gap: '0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  paddingBottom: '0.5rem',
                  borderBottom: 'var(--border-style)',
                  marginBottom: '0.75rem'
                }}>
                  <span>Product / Stock Item</span>
                  <span>Stock Available</span>
                  <span>Quantity</span>
                  <span>Unit Price (₹)</span>
                  <span style={{ textAlign: 'right', paddingRight: '28px' }}>Subtotal</span>
                </div>

                {/* Items loop */}
                {items.map((item, index) => {
                  const selectedProd = products.find(p => p.id === item.productId);
                  const maxStock = selectedProd ? selectedProd.currentStock : 0;
                  const rowSubtotal = item.quantity * item.unitPrice;
                  
                  const isStockWarning = challanStatus === 'Confirmed' && selectedProd && maxStock < item.quantity;

                  return (
                    <div key={index} className="challan-product-row">
                      <select 
                        className="form-select"
                        required
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                        ))}
                      </select>

                      <div style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 600, 
                        color: selectedProd ? (maxStock > 0 ? 'var(--text-primary)' : 'var(--color-danger)') : 'var(--text-tertiary)',
                        backgroundColor: 'var(--bg-tertiary)',
                        padding: '0.625rem',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        border: 'var(--border-style)'
                      }}>
                        {selectedProd ? `${maxStock} units` : 'Select Product'}
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          style={{ borderColor: isStockWarning ? 'var(--color-danger)' : '' }}
                        />
                        {isStockWarning && (
                          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-danger)' }} title="Quantity exceeds available stock!">
                            <AlertTriangle size={16} />
                          </div>
                        )}
                      </div>

                      <input 
                        type="number" 
                        className="form-input" 
                        min="0"
                        step="0.01"
                        required
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '80px', textAlign: 'right' }}>
                          ₹{rowSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '0.4rem', color: 'var(--color-danger)', border: 'none', background: 'none' }}
                          disabled={items.length === 1}
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  onClick={handleAddItem}
                >
                  <Plus size={16} />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Panel: Invoice Totals & Submit */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card-widget">
              <span className="widget-title" style={{ borderBottom: 'none', padding: 0 }}>
                Invoice Summary
              </span>
              
              <div className="challan-totals-table">
                <div className="totals-row">
                  <span>Line Items count:</span>
                  <strong>{items.length} items</strong>
                </div>
                <div className="totals-row">
                  <span>Total Quantity:</span>
                  <strong>{calculatedTotalQty} units</strong>
                </div>
                
                <div className="totals-row grand-total">
                  <span>Grand Total:</span>
                  <span>₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {challanStatus === 'Confirmed' && (
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '0.75rem',
                  color: 'var(--color-success)',
                  alignItems: 'flex-start'
                }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Note: Confirming now will decrease available stock immediately upon saving.</span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', height: '42px', marginTop: '0.5rem' }}
                disabled={saving}
              >
                <Save size={18} />
                <span>{saving ? 'Processing...' : 'Save Challan Invoice'}</span>
              </button>
            </div>

            {/* Live Document Preview Sheet */}
            <div className="card-widget" style={{ padding: '1.25rem', background: '#ffffff', color: '#1e293b', border: '1px solid #cbd5e1', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)', position: 'relative', overflow: 'hidden' }}>
              
              {/* Draft / Confirmed Watermark */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-30deg)',
                fontSize: '2rem',
                fontWeight: 900,
                color: challanStatus === 'Confirmed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                letterSpacing: '0.1em',
                pointerEvents: 'none',
                userSelect: 'none',
                textAlign: 'center',
                zIndex: 1,
                whiteSpace: 'nowrap'
              }}>
                {challanStatus.toUpperCase()} PREVIEW
              </div>

              <div style={{ zIndex: 2, position: 'relative' }}>
                {/* Header */}
                <div style={{ borderBottom: '2px solid #6366f1', paddingBottom: '0.5rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5' }}>AETHER CORP</div>
                    <div style={{ fontSize: '0.5rem', color: '#64748b' }}>Operations Gate 12</div>
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#334155', textAlign: 'right' }}>
                    CHALLAN SHEET
                  </div>
                </div>

                {/* Bill To */}
                <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 800, textTransform: 'uppercase', color: '#475569', marginBottom: '0.15rem', fontSize: '0.55rem' }}>BILL TO:</div>
                  {selectedCustomerId ? (
                    (() => {
                      const cust = customers.find(c => c.id === selectedCustomerId);
                      return (
                        <div style={{ color: '#1e293b' }}>
                          <div style={{ fontWeight: 700 }}>{cust?.businessName}</div>
                          <div>Attn: {cust?.name}</div>
                          <div style={{ fontSize: '0.55rem', marginTop: '0.1rem' }}>Address: {cust?.address}</div>
                        </div>
                      );
                    })()
                  ) : (
                    <div style={{ fontStyle: 'italic', color: '#94a3b8' }}>Select a customer to preview...</div>
                  )}
                </div>

                {/* Items Table */}
                <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.5fr', fontSize: '0.55rem', fontWeight: 800, color: '#475569', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.2rem', marginBottom: '0.2rem' }}>
                    <span>ITEM</span>
                    <span style={{ textAlign: 'center' }}>QTY</span>
                    <span style={{ textAlign: 'right' }}>PRICE</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '120px', overflowY: 'auto' }}>
                    {items.map((item, idx) => {
                      if (!item.productId) return null;
                      const prod = products.find(p => p.id === item.productId);
                      return (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 1.5fr', fontSize: '0.55rem', color: '#334155' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prod ? prod.name : 'Selected Product'}
                          </span>
                          <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                          <span style={{ textAlign: 'right' }}>₹{(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })}
                    {items.filter(item => item.productId).length === 0 && (
                      <div style={{ fontStyle: 'italic', fontSize: '0.55rem', color: '#94a3b8', textAlign: 'center', padding: '0.5rem' }}>
                        No items added yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.65rem', fontWeight: 800 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b', marginRight: '0.5rem', fontSize: '0.55rem' }}>GRAND TOTAL:</span>
                    <span style={{ color: '#1e293b' }}>₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default ChallanBuilder;
