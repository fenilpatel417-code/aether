import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit, AlertTriangle, History, X, HelpCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

interface StockLog {
  id: string;
  quantityChanged: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdBy: string;
  createdAt: string;
}

const Inventory: React.FC = () => {
  const { token, user, hasRole } = useAuth();
  const { showToast } = useToast();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Stock History State
  const [selectedProductLogs, setSelectedProductLogs] = useState<Product | null>(null);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Modal Add/Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 0,
    location: '',
    stockReason: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        q: search,
        lowStock: lowStockFilter.toString(),
        page: page.toString(),
        limit: '8',
      });
      const response = await fetch(`http://localhost:5000/api/products?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to load inventory products');
      }
      const data = await response.json();
      setProducts(data.products);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search, lowStockFilter, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch Stock Logs inside modal
  const handleOpenLogs = async (product: Product) => {
    setSelectedProductLogs(product);
    setLoadingLogs(true);
    try {
      const response = await fetch(`http://localhost:5000/api/products/${product.id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch stock movement history');
      }
      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      alert(err.message);
      setSelectedProductLogs(null);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minStockAlert: 0,
      location: '',
      stockReason: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.unitPrice,
      currentStock: product.currentStock,
      minStockAlert: product.minStockAlert,
      location: product.location,
      stockReason: '', // Let user type a reason for this edit adjustments
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'unitPrice' || name === 'currentStock' || name === 'minStockAlert' 
        ? Number(value) 
        : value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const url = editingProduct 
        ? `http://localhost:5000/api/products/${editingProduct.id}`
        : 'http://localhost:5000/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product details');
      }

      setIsModalOpen(false);
      showToast(
        editingProduct ? 'Product details adjusted successfully' : 'New inventory product registered',
        'success'
      );
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message);
      showToast(err.message || 'Failed to save product details', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Stock safety indicator helper
  const getStockSafetyBadge = (product: Product) => {
    if (product.currentStock === 0) {
      return { text: 'OUT OF STOCK', className: 'badge-danger', icon: true };
    }
    if (product.currentStock <= product.minStockAlert) {
      return { text: 'LOW STOCK', className: 'badge-warning', icon: true };
    }
    return { text: 'HEALTHY', className: 'badge-success', icon: false };
  };

  const isWritePermitted = hasRole(['Admin', 'Warehouse']);
  const isViewLogsPermitted = hasRole(['Admin', 'Warehouse', 'Accounts']);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Product & Inventory Logs</h1>
          <p className="page-subtitle">Manage catalog, track items, warehouse locations, and stock intake logs</p>
        </div>
        {isWritePermitted && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {error && <div style={{ padding: '1rem', color: 'red' }}>Error: {error}</div>}

      {/* Filter controls */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name, SKU, category..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              checked={lowStockFilter}
              onChange={(e) => {
                setLowStockFilter(e.target.checked);
                setPage(1);
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Show Low Stock Alerts Only</span>
          </label>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading products list...</div>
      ) : products.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: 'var(--border-style)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No items found in stock inventory.</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>SKU Code</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Warehouse Location</th>
                  <th>Stock Level</th>
                  <th>Safety Alert</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const safety = getStockSafetyBadge(product);
                  return (
                    <tr key={product.id}>
                      <td style={{ fontWeight: 600 }}>{product.name}</td>
                      <td><code style={{ fontSize: '0.85rem', color: 'var(--color-brand)', fontWeight: 600 }}>{product.sku}</code></td>
                      <td>{product.category}</td>
                      <td>₹{product.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>{product.location}</td>
                      <td style={{ fontWeight: 700 }}>{product.currentStock} units</td>
                      <td>
                        <span className={`badge ${safety.className}`}>
                          {safety.icon && <AlertTriangle size={12} />}
                          {safety.text}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {isViewLogsPermitted && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              title="View stock history logs"
                              onClick={() => handleOpenLogs(product)}
                            >
                              <History size={14} />
                              <span>History</span>
                            </button>
                          )}
                          {isWritePermitted && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              title="Edit product details"
                              onClick={() => handleOpenEdit(product)}
                            >
                              <Edit size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* Stock logs modal view */}
      {selectedProductLogs && (
        <div className="modal-overlay" onClick={() => setSelectedProductLogs(null)}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">Stock Movement Log Feed</span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Product: <strong>{selectedProductLogs.name}</strong> | SKU: <code>{selectedProductLogs.sku}</code>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedProductLogs(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Fetching records...</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No recorded stock changes.</div>
              ) : (
                <div className="table-container" style={{ margin: 0 }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>Qty Changed</th>
                        <th>Logged By</th>
                        <th>Reason for adjustment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontSize: '0.75rem' }}>
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td>
                            <span className={`badge ${log.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.65rem' }}>
                              {log.movementType}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            {log.quantityChanged} units
                          </td>
                          <td>{log.createdBy}</td>
                          <td style={{ fontSize: '0.8rem', whiteSpace: 'normal', lineBreak: 'anywhere' }}>
                            {log.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedProductLogs(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit product modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingProduct ? 'Edit Stock Product' : 'Add New Inventory Product'}</span>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && <div className="login-err" style={{ marginBottom: '1rem' }}>{formError}</div>}

                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    className="form-input" 
                    required 
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SKU Code</label>
                    <input 
                      type="text" 
                      name="sku" 
                      className="form-input" 
                      required 
                      value={formData.sku}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input 
                      type="text" 
                      name="category" 
                      className="form-input" 
                      placeholder="e.g. Electrical, Hardware"
                      required 
                      value={formData.category}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Unit Price (₹)</label>
                    <input 
                      type="number" 
                      name="unitPrice" 
                      className="form-input" 
                      min="0"
                      step="0.01"
                      required 
                      value={formData.unitPrice}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Warehouse Location</label>
                    <input 
                      type="text" 
                      name="location" 
                      className="form-input" 
                      placeholder="e.g. Rack A5, Bin 12"
                      required 
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Current Stock Level</label>
                    <input 
                      type="number" 
                      name="currentStock" 
                      className="form-input" 
                      min="0"
                      required 
                      value={formData.currentStock}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Safety Alert Limit (Min Qty)</label>
                    <input 
                      type="number" 
                      name="minStockAlert" 
                      className="form-input" 
                      min="0"
                      required 
                      value={formData.minStockAlert}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Stock Adjustment</label>
                  <input 
                    type="text" 
                    name="stockReason" 
                    className="form-input" 
                    placeholder={editingProduct ? "Explain why stock level is modified (e.g. physical recount audit, leakage check)..." : "Reason for intake (e.g. seed intake, manufacturer purchase order)..."}
                    value={formData.stockReason}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
