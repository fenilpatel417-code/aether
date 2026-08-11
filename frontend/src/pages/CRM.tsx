import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Edit, Eye, X, Mail, Phone, Building2, Landmark, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: 'Retail' | 'Wholesale' | 'Distributor';
  address: string;
  status: 'Lead' | 'Active' | 'Inactive';
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CRM: React.FC = () => {
  const { token, user, hasRole } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'Retail' as Customer['customerType'],
    address: '',
    status: 'Lead' as Customer['status'],
    followUpDate: '',
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch Customers Callback
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        q: search,
        status: statusFilter,
        page: page.toString(),
        limit: '8',
      });
      const response = await fetch(`http://localhost:5000/api/customers?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch customers list');
      }
      const data = await response.json();
      setCustomers(data.customers);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Open Modal for Add Customer
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'Retail',
      address: '',
      status: 'Lead',
      followUpDate: '',
      notes: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Modal for Edit Customer
  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType,
      address: customer.address,
      status: customer.status,
      followUpDate: customer.followUpDate ? new Date(customer.followUpDate).toISOString().split('T')[0] : '',
      notes: customer.notes || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload = {
      ...formData,
      followUpDate: formData.followUpDate ? formData.followUpDate : null
    };

    try {
      const url = editingCustomer 
        ? `http://localhost:5000/api/customers/${editingCustomer.id}`
        : 'http://localhost:5000/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      setIsModalOpen(false);
      showToast(
        editingCustomer ? 'Customer profile updated successfully' : 'New customer profile registered',
        'success'
      );
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message);
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadgeClass = (status: Customer['status']) => {
    switch (status) {
      case 'Active': return 'badge-success';
      case 'Lead': return 'badge-warning';
      case 'Inactive': return 'badge-danger';
    }
  };

  const isWritePermitted = hasRole(['Admin', 'Sales']);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">CRM Customer Management</h1>
          <p className="page-subtitle">Track interactions, leads pipeline, and customer details</p>
        </div>
        {isWritePermitted && (
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {error && <div style={{ padding: '1rem', color: 'red' }}>Error: {error}</div>}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by name, business, email, phone..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select 
            className="form-select" 
            style={{ width: '160px' }}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Lead">Lead</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* CRM Grid List */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading customer list...</div>
      ) : customers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: 'var(--border-style)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No customers found matching the search criteria.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {customers.map((customer) => (
              <div key={customer.id} className="card-widget animate-fade-in" style={{ gap: '0.75rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className={`badge ${getStatusBadgeClass(customer.status)}`}>
                    {customer.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                    {customer.customerType}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{customer.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                    <Building2 size={14} style={{ color: 'var(--text-tertiary)' }} />
                    {customer.businessName}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '0.25rem 0', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Phone size={12} style={{ color: 'var(--text-tertiary)' }} />
                    <span>{customer.mobile}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Mail size={12} style={{ color: 'var(--text-tertiary)' }} />
                    <span>{customer.email}</span>
                  </div>
                  {customer.gstNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Landmark size={12} style={{ color: 'var(--text-tertiary)' }} />
                      <span>GST: {customer.gstNumber}</span>
                    </div>
                  )}
                </div>

                {customer.followUpDate && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--color-warning)', 
                    backgroundColor: 'var(--color-warning-light)', 
                    padding: '0.4rem 0.6rem', 
                    borderRadius: 'var(--radius-sm)', 
                    fontWeight: 600,
                    alignSelf: 'flex-start'
                  }}>
                    Next Follow-up: {new Date(customer.followUpDate).toLocaleDateString('en-IN')}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: 'var(--border-style)', paddingTop: '0.75rem' }}>
                  <Link to={`/crm/${customer.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                    <Eye size={14} />
                    <span>View Timeline</span>
                  </Link>
                  {isWritePermitted && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(customer)} title="Edit profile">
                      <Edit size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
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

      {/* CRM Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingCustomer ? 'Edit Customer Info' : 'Create New Customer profile'}</span>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && <div className="login-err" style={{ marginBottom: '1rem' }}>{formError}</div>}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      className="form-input" 
                      required 
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Name</label>
                    <input 
                      type="text" 
                      name="businessName" 
                      className="form-input" 
                      required 
                      value={formData.businessName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input 
                      type="tel" 
                      name="mobile" 
                      className="form-input" 
                      required 
                      value={formData.mobile}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      className="form-input" 
                      required 
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">GST Number (Optional)</label>
                    <input 
                      type="text" 
                      name="gstNumber" 
                      className="form-input" 
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      value={formData.gstNumber}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Customer Type</label>
                    <select 
                      name="customerType" 
                      className="form-select" 
                      value={formData.customerType}
                      onChange={handleInputChange}
                    >
                      <option value="Retail">Retail</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Distributor">Distributor</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Office Address</label>
                  <textarea 
                    name="address" 
                    className="form-textarea" 
                    required 
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      name="status" 
                      className="form-select" 
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Lead">Lead</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Next Follow-up Date</label>
                    <input 
                      type="date" 
                      name="followUpDate" 
                      className="form-input" 
                      value={formData.followUpDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {!editingCustomer && (
                  <div className="form-group">
                    <label className="form-label">Initial Customer Notes</label>
                    <textarea 
                      name="notes" 
                      className="form-textarea" 
                      placeholder="Enter follow-up context, meeting summary, or introductory comments..."
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
