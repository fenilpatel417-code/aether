import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, FileText, Download, X, AlertCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import { API_BASE_URL } from '../config';

interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customerSnapshot: string; // JSON String
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  totalQuantity: number;
  totalAmount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    businessName: string;
  };
}

interface ChallanItem {
  id: string;
  productId: string | null;
  productSnapshot: string; // JSON String
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface CustomerSnapshot {
  id: string;
  name: string;
  businessName: string;
  email: string;
  mobile: string;
  gstNumber: string;
  address: string;
}

interface ProductSnapshot {
  id: string;
  name: string;
  sku: string;
  category: string;
  location: string;
}

const Challans: React.FC = () => {
  const { token, user, hasRole } = useAuth();

  // State
  const [challans, setChallans] = useState<Challan[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Challan for Modal details
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const fetchChallans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        status: statusFilter,
        page: page.toString(),
        limit: '8',
      });
      const response = await fetch(`${API_BASE_URL}/api/challans?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to load sales challans');
      }
      const data = await response.json();
      setChallans(data.challans);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, page]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  const handleOpenDetails = async (challan: Challan) => {
    setSelectedChallan(challan);
    setLoadingDetails(true);
    setTransitionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/challans/${challan.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch challan invoice details');
      }
      const data = await response.json();
      setChallanItems(data.items);
    } catch (err: any) {
      alert(err.message);
      setSelectedChallan(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'Confirmed' | 'Cancelled') => {
    if (!selectedChallan) return;
    const confirmMsg = newStatus === 'Confirmed'
      ? 'Are you sure you want to confirm this sales challan? This will reduce product stock levels.'
      : 'Are you sure you want to cancel this challan? Stock levels will be reverted if previously confirmed.';
    
    if (!window.confirm(confirmMsg)) return;

    setTransitioning(true);
    setTransitionError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/challans/${selectedChallan.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update challan state');
      }

      // Close details and refresh
      setSelectedChallan(null);
      fetchChallans();
    } catch (err: any) {
      setTransitionError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  // PDF Generation Exporter
  const handleExportPDF = (challan: Challan, items: ChallanItem[]) => {
    try {
      const cust: CustomerSnapshot = JSON.parse(challan.customerSnapshot);

      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = '#4f46e5';
      const textColor = '#1e293b';
      const grayColor = '#64748b';

      // Title & Header layout
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('AETHER DISTRIBUTION CORP', 15, 18);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Industrial Wholesale & Supply Chains Operations Portal', 15, 25);
      doc.text('GSTIN: 27AETHER9999P1Z9 | Phone: +91 99999 88888', 15, 30);

      doc.setFontSize(16);
      doc.setFont('Helvetica', 'bold');
      doc.text('SALES CHALLAN', 145, 25);

      // Invoice metadata box
      doc.setFillColor(248, 250, 252);
      doc.rect(15, 48, 180, 28, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(15, 48, 180, 28, 'D');

      doc.setTextColor(textColor);
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('Challan Number:', 20, 54);
      doc.setFont('Helvetica', 'normal');
      doc.text(challan.challanNumber, 50, 54);

      doc.setFont('Helvetica', 'bold');
      doc.text('Date of Issue:', 20, 60);
      doc.setFont('Helvetica', 'normal');
      doc.text(new Date(challan.createdAt).toLocaleDateString('en-IN'), 50, 60);

      doc.setFont('Helvetica', 'bold');
      doc.text('Status:', 20, 66);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(challan.status === 'Confirmed' ? '#10b981' : challan.status === 'Draft' ? '#f59e0b' : '#ef4444');
      doc.text(challan.status.toUpperCase(), 50, 66);

      doc.setTextColor(textColor);
      doc.setFont('Helvetica', 'bold');
      doc.text('Authorized By:', 115, 54);
      doc.setFont('Helvetica', 'normal');
      doc.text(challan.createdBy, 145, 54);

      doc.setFont('Helvetica', 'bold');
      doc.text('Verification Code:', 115, 60);
      doc.setFont('Helvetica', 'normal');
      doc.text(`UID-${challan.id.slice(0, 8).toUpperCase()}`, 145, 60);

      // Bill To details
      doc.setTextColor(textColor);
      doc.setFontSize(11);
      doc.setFont('Helvetica', 'bold');
      doc.text('BILL TO & RECIPIENT:', 15, 88);

      doc.setFontSize(9);
      doc.text('Business Name:', 15, 95);
      doc.setFont('Helvetica', 'bold');
      doc.text(cust.businessName, 45, 95);

      doc.setFont('Helvetica', 'normal');
      doc.text('Contact Person:', 15, 101);
      doc.text(cust.name, 45, 101);

      doc.text('Mobile Number:', 15, 107);
      doc.text(cust.mobile, 45, 107);

      doc.text('Email Address:', 15, 113);
      doc.text(cust.email, 45, 113);

      doc.text('GSTIN Number:', 15, 119);
      doc.setFont('Helvetica', 'bold');
      doc.text(cust.gstNumber || 'N/A', 45, 119);

      doc.setFont('Helvetica', 'normal');
      doc.text('Delivery Address:', 110, 95);
      const splitAddress = doc.splitTextToSize(cust.address, 85);
      doc.text(splitAddress, 110, 100);

      // Divider line
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.5);
      doc.line(15, 128, 195, 128);

      // Table Header
      let yOffset = 135;
      doc.setFillColor(241, 245, 249);
      doc.rect(15, yOffset, 180, 8, 'F');
      
      doc.setTextColor(textColor);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Item Description', 18, yOffset + 5.5);
      doc.text('SKU', 85, yOffset + 5.5);
      doc.text('Qty', 125, yOffset + 5.5);
      doc.text('Unit Price', 145, yOffset + 5.5);
      doc.text('Total Amount', 170, yOffset + 5.5);

      doc.setLineWidth(0.1);
      doc.setDrawColor(203, 213, 225);
      doc.line(15, yOffset + 8, 195, yOffset + 8);
      yOffset += 8;

      // Table Rows
      doc.setFont('Helvetica', 'normal');
      items.forEach((item) => {
        const prod: ProductSnapshot = JSON.parse(item.productSnapshot);
        
        doc.text(prod.name, 18, yOffset + 5);
        doc.text(prod.sku, 85, yOffset + 5);
        doc.text(item.quantity.toString(), 125, yOffset + 5);
        doc.text(`INR ${item.unitPrice.toFixed(2)}`, 145, yOffset + 5);
        doc.text(`INR ${item.totalPrice.toFixed(2)}`, 170, yOffset + 5);

        doc.line(15, yOffset + 8, 195, yOffset + 8);
        yOffset += 8;
      });

      // Invoice Summary Box
      yOffset += 5;
      doc.setFillColor(248, 250, 252);
      doc.rect(120, yOffset, 75, 25, 'F');
      doc.rect(120, yOffset, 75, 25, 'D');

      doc.setFont('Helvetica', 'normal');
      doc.text('Total Items Quantity:', 125, yOffset + 7);
      doc.text(challan.totalQuantity.toString(), 170, yOffset + 7);

      doc.setFont('Helvetica', 'bold');
      doc.text('Grand Total:', 125, yOffset + 17);
      doc.text(`INR ${challan.totalAmount.toFixed(2)}`, 170, yOffset + 17);

      // Footer
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(grayColor);
      doc.text('This is a computer-generated commercial sales challan operations document.', 15, 275);
      doc.text('All goods listed remain property of Aether Distribution until full accounts settlement.', 15, 279);

      // Save
      doc.save(`${challan.challanNumber}_Invoice.pdf`);
    } catch (e: any) {
      alert(`Failed to export PDF: ${e.message}`);
    }
  };

  const getStatusBadgeClass = (status: Challan['status']) => {
    switch (status) {
      case 'Confirmed': return 'badge-success';
      case 'Draft': return 'badge-warning';
      case 'Cancelled': return 'badge-danger';
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Sales Challans Portal</h1>
          <p className="page-subtitle">Track wholesale shipments, print commercial invoices, check dispatch status</p>
        </div>
        {hasRole(['Admin', 'Sales']) && (
          <Link to="/challans/new" className="btn btn-primary">
            <Plus size={18} />
            <span>New Sales Challan</span>
          </Link>
        )}
      </div>

      {error && <div style={{ padding: '1rem', color: 'red' }}>Error: {error}</div>}

      {/* Filter and search bar */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select 
            className="form-select" 
            style={{ width: '180px' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Challan Statuses</option>
            <option value="Draft">Draft (Pending)</option>
            <option value="Confirmed">Confirmed (Stock Reduced)</option>
            <option value="Cancelled">Cancelled (Reverted)</option>
          </select>
        </div>
      </div>

      {/* List Challans */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading sales challans...</div>
      ) : challans.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: 'var(--border-style)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No sales challans recorded in the database.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Challan Number</th>
                  <th>Customer Name</th>
                  <th>Business / Enterprise</th>
                  <th>Created Date</th>
                  <th>Items Qty</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Creator</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((challan) => (
                  <tr key={challan.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-brand)' }}>{challan.challanNumber}</td>
                    <td>{challan.customer.name}</td>
                    <td>{challan.customer.businessName}</td>
                    <td>{new Date(challan.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{challan.totalQuantity} units</td>
                    <td style={{ fontWeight: 600 }}>₹{challan.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(challan.status)}`}>
                        {challan.status}
                      </span>
                    </td>
                    <td><code>{challan.createdBy}</code></td>
                    <td>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleOpenDetails(challan)}
                      >
                        <FileText size={14} />
                        <span>Open Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <span className="pagination-page-indicator">
                Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <div className="pagination-btn-group">
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Challan invoice detailed modal */}
      {selectedChallan && (
        <div className="modal-overlay" onClick={() => setSelectedChallan(null)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Commercial Sales Challan Invoice</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Serial: <strong>{selectedChallan.challanNumber}</strong> | Created: {new Date(selectedChallan.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedChallan(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {transitionError && <div className="login-err">{transitionError}</div>}
              
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading invoice records...</div>
              ) : (
                <>
                  {/* Two column snapshot details */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: 'var(--border-style)' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        Customer Billing & Details (Snapshot)
                      </div>
                      {(() => {
                        try {
                          const cust: CustomerSnapshot = JSON.parse(selectedChallan.customerSnapshot);
                          return (
                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div><strong>Name:</strong> {cust.name}</div>
                              <div><strong>Enterprise:</strong> {cust.businessName}</div>
                              <div><strong>Mobile:</strong> {cust.mobile}</div>
                              <div><strong>Email:</strong> {cust.email}</div>
                              <div><strong>GSTIN:</strong> {cust.gstNumber || 'Unregistered'}</div>
                              <div style={{ marginTop: '0.25rem' }}><strong>Shipping:</strong> {cust.address}</div>
                            </div>
                          );
                        } catch (e) {
                          return <div style={{ fontSize: '0.85rem', color: 'red' }}>Snapshot parsing error</div>;
                        }
                      })()}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>INVOICE STATUS</span>
                          <div style={{ marginTop: '0.25rem' }}>
                            <span className={`badge ${getStatusBadgeClass(selectedChallan.status)}`} style={{ fontSize: '0.85rem' }}>
                              {selectedChallan.status}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CREATOR USERNAME</span>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginTop: '0.1rem' }}>{selectedChallan.createdBy}</div>
                        </div>
                      </div>

                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ alignSelf: 'flex-start', background: 'var(--bg-secondary)' }}
                        onClick={() => handleExportPDF(selectedChallan, challanItems)}
                      >
                        <Download size={14} />
                        <span>Download PDF Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Itemized Line Details
                    </div>
                    <div className="table-container" style={{ margin: 0 }}>
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Product (Snapshot)</th>
                            <th>SKU</th>
                            <th>Warehouse Location</th>
                            <th>Qty Ordered</th>
                            <th>Unit Price</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {challanItems.map((item) => {
                            let prod: ProductSnapshot = { id: '', name: 'Unknown Item', sku: 'N/A', category: 'N/A', location: 'N/A' };
                            try {
                              prod = JSON.parse(item.productSnapshot);
                            } catch (e) {}

                            return (
                              <tr key={item.id}>
                                <td style={{ fontWeight: 600 }}>{prod.name}</td>
                                <td><code>{prod.sku}</code></td>
                                <td>{prod.location}</td>
                                <td style={{ fontWeight: 700 }}>{item.quantity} units</td>
                                <td>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                                <td style={{ fontWeight: 600 }}>₹{item.totalPrice.toLocaleString('en-IN')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'var(--border-style)', minWidth: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span>Total Items:</span>
                          <strong>{selectedChallan.totalQuantity} units</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>
                          <span>Grand Total:</span>
                          <span>₹{selectedChallan.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {/* Workflow Transitions */}
                {selectedChallan && !loadingDetails && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedChallan.status === 'Draft' && hasRole(['Admin', 'Sales']) && (
                      <button 
                        className="btn btn-primary btn-sm animate-pulse-subtle" 
                        disabled={transitioning}
                        onClick={() => handleStatusUpdate('Confirmed')}
                        style={{ backgroundColor: 'var(--color-success)' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Confirm Challan (Dispatch)</span>
                      </button>
                    )}
                    {selectedChallan.status !== 'Cancelled' && hasRole(['Admin', 'Accounts']) && (
                      <button 
                        className="btn btn-danger btn-sm" 
                        disabled={transitioning}
                        onClick={() => handleStatusUpdate('Cancelled')}
                      >
                        <Trash2 size={14} />
                        <span>Cancel Challan</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedChallan(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Challans;
