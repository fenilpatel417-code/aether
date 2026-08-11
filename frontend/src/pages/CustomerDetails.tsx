import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Phone, 
  Mail, 
  Landmark, 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  PlusCircle, 
  BookOpen
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CustomerNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: string;
}

interface CustomerDetailsData {
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
  followUpNotes: CustomerNote[];
}

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, hasRole } = useAuth();
  const { showToast } = useToast();
  
  // States
  const [customer, setCustomer] = useState<CustomerDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchCustomerDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Failed to retrieve customer timeline data');
      }
      const data = await response.json();
      setCustomer(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    setNoteError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/customers/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ note: newNote })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit follow-up note');
      }

      setNewNote('');
      showToast('Timeline note logged successfully', 'success');
      fetchCustomerDetails(); // refresh details to show new note in timeline
    } catch (err: any) {
      setNoteError(err.message);
      showToast(err.message || 'Failed to submit follow-up note', 'error');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading customer details & timeline...</div>;
  }

  if (error || !customer) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/crm" className="btn btn-secondary btn-sm" style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to CRM
        </Link>
        <div style={{ color: 'red' }}>Error: {error || 'Customer not found'}</div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: CustomerDetailsData['status']) => {
    switch (status) {
      case 'Active': return 'badge-success';
      case 'Lead': return 'badge-warning';
      case 'Inactive': return 'badge-danger';
    }
  };

  const isWritePermitted = hasRole(['Admin', 'Sales']);
  const isOverdue = customer.followUpDate ? new Date(customer.followUpDate) < new Date() : false;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Back Button */}
      <div>
        <Link to="/crm" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
          <ArrowLeft size={16} />
          <span>Back to Customer list</span>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Left Column: Customer Detailed Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card-widget">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge ${getStatusBadgeClass(customer.status)}`}>
                {customer.status}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {customer.customerType}
              </span>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{customer.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                <Building2 size={16} style={{ color: 'var(--text-tertiary)' }} />
                <span>{customer.businessName}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', borderTop: 'var(--border-style)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                <Phone size={16} style={{ color: 'var(--text-tertiary)' }} />
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Mobile Number</div>
                  <div style={{ fontWeight: 500 }}>{customer.mobile}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                <Mail size={16} style={{ color: 'var(--text-tertiary)' }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Email Address</div>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                <Landmark size={16} style={{ color: 'var(--text-tertiary)' }} />
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>GST Registration</div>
                  <div style={{ fontWeight: 500 }}>{customer.gstNumber || 'Not Registered'}</div>
                </div>
              </div>

              {customer.followUpDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <Calendar size={16} style={{ color: 'var(--color-warning)' }} />
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Next Scheduled Follow-up</div>
                    <div className={isOverdue ? 'overdue-pulse' : ''} style={isOverdue ? {} : { fontWeight: 600, color: 'var(--color-warning)' }}>
                      {new Date(customer.followUpDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ borderTop: 'var(--border-style)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Registered Office Address</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{customer.address}</p>
            </div>
          </div>
        </div>

        {/* Right Column: CRM Timeline Log & Add Note Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Add Follow-up Note Form */}
          {isWritePermitted && (
            <div className="card-widget" style={{ borderLeft: '4px solid var(--color-brand)' }}>
              <div className="widget-title-container" style={{ border: 'none', padding: 0 }}>
                <span className="widget-title">
                  <PlusCircle size={18} style={{ color: 'var(--color-brand)' }} />
                  Record New Interaction / Follow-up
                </span>
              </div>
              <form onSubmit={handleAddNote}>
                {noteError && <div className="login-err" style={{ marginBottom: '1rem' }}>{noteError}</div>}
                <div className="form-group">
                  <textarea 
                    className="form-input" 
                    style={{ minHeight: '80px' }}
                    placeholder="Briefly describe what was discussed (e.g. details of phone call, pricing discussion, or product catalog request)..."
                    required
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    disabled={submittingNote}
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={submittingNote}>
                  {submittingNote ? 'Saving note...' : 'Log Follow-up Note'}
                </button>
              </form>
            </div>
          )}

          {/* CRM Timeline logs */}
          <div className="card-widget">
            <div className="widget-title-container">
              <span className="widget-title">
                <BookOpen size={18} style={{ color: 'var(--color-brand)' }} />
                CRM Timeline History
              </span>
            </div>

            {customer.followUpNotes.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                No recorded interactions for this customer yet.
              </div>
            ) : (
              <div className="timeline">
                {customer.followUpNotes.map((note) => (
                  <div key={note.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-author" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} />
                          {note.createdBy}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} />
                          {new Date(note.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="timeline-text">{note.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default CustomerDetails;
