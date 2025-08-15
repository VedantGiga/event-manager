import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import useAppStore from '../store/useAppStore';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { createBooking, isOnline } = useAppStore();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const [bookingForm, setBookingForm] = useState({
    quantity: 1,
    attendeeInfo: [{ firstName: '', lastName: '', email: '', phone: '' }]
  });

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsAPI.getEvent(id);
      setEvent(response.data.data.event);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (quantity) => {
    const newAttendeeInfo = Array.from({ length: quantity }, (_, i) => 
      bookingForm.attendeeInfo[i] || { firstName: '', lastName: '', email: '', phone: '' }
    );
    
    setBookingForm({
      quantity,
      attendeeInfo: newAttendeeInfo
    });
  };

  const handleAttendeeChange = (index, field, value) => {
    const newAttendeeInfo = [...bookingForm.attendeeInfo];
    newAttendeeInfo[index] = { ...newAttendeeInfo[index], [field]: value };
    setBookingForm(prev => ({ ...prev, attendeeInfo: newAttendeeInfo }));
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError(null);
      
      await createBooking({
        eventId: id,
        ...bookingForm
      });
      
      setBookingSuccess(true);
      if (isOnline) {
        fetchEvent(); // Refresh event data to update capacity
      }
    } catch (err) {
      setBookingError(err);
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <LoadingSpinner text="Loading event details..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchEvent} />;
  if (!event) return <ErrorMessage error="Event not found" />;

  const canBook = event.status === 'published' && 
                  new Date(event.dateTime.start) > new Date() && 
                  event.capacity.available > 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
      {/* Event Header */}
      <div className="card">
        {event.images && event.images[0] && (
          <img 
            src={event.images[0]} 
            alt={event.title}
            style={{ 
              width: '100%', 
              height: '300px', 
              objectFit: 'cover', 
              borderRadius: '0.5rem',
              marginBottom: '1.5rem'
            }}
          />
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            {event.title}
          </h1>
          <span 
            style={{ 
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: event.status === 'published' ? 'var(--success)' : 'var(--warning)',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {event.status}
          </span>
        </div>
        
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          {event.description}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Event Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.125rem' }}>📅</span>
                <div>
                  <div style={{ fontWeight: '500' }}>Start</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {formatDate(event.dateTime.start)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.125rem' }}>🏁</span>
                <div>
                  <div style={{ fontWeight: '500' }}>End</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {formatDate(event.dateTime.end)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.125rem' }}>📍</span>
                <div>
                  <div style={{ fontWeight: '500' }}>{event.venue.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {event.venue.address}, {event.venue.city}
                    {event.venue.state && `, ${event.venue.state}`}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.125rem' }}>🎫</span>
                <div>
                  <div style={{ fontWeight: '500' }}>
                    {event.pricing.isFree ? 'Free' : `$${event.pricing.ticketPrice}`}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {event.capacity.available}/{event.capacity.total} tickets available
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Organizer</h3>
            <div>
              <div style={{ fontWeight: '500' }}>
                {event.organizerId.firstName} {event.organizerId.lastName}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {event.organizerId.email}
              </div>
            </div>
            
            {event.tags && event.tags.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>Tags</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {event.tags.map((tag, index) => (
                    <span 
                      key={index}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--border)',
                        fontSize: '0.875rem'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Form */}
      {canBook && (
        <div className="card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Book Your Tickets
          </h2>
          
          {bookingSuccess ? (
            <div className="alert alert-success">
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Booking Successful! 🎉</h3>
              <p style={{ margin: 0 }}>
                {isOnline 
                  ? 'Your booking has been created successfully. Check your email for confirmation details.'
                  : 'Your booking has been saved and will be processed when you\'re back online.'
                }
              </p>
            </div>
          ) : (
            <form onSubmit={handleBooking}>
              {bookingError && <ErrorMessage error={bookingError} />}
              
              <div className="form-group">
                <label className="form-label">Number of Tickets</label>
                <select
                  className="form-input"
                  value={bookingForm.quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                  style={{ maxWidth: '200px' }}
                >
                  {Array.from({ length: Math.min(10, event.capacity.available) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              
              <h3 style={{ fontSize: '1.125rem', fontWeight: '500', margin: '1.5rem 0 1rem 0' }}>
                Attendee Information
              </h3>
              
              {bookingForm.attendeeInfo.map((attendee, index) => (
                <div key={index} className="card" style={{ marginBottom: '1rem', backgroundColor: 'var(--bg-secondary)' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem' }}>
                    Attendee {index + 1}
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        value={attendee.firstName}
                        onChange={(e) => handleAttendeeChange(index, 'firstName', e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        value={attendee.lastName}
                        onChange={(e) => handleAttendeeChange(index, 'lastName', e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        required
                        value={attendee.email}
                        onChange={(e) => handleAttendeeChange(index, 'email', e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        type="tel"
                        className="form-input"
                        value={attendee.phone}
                        onChange={(e) => handleAttendeeChange(index, 'phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                <div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                    Total: {event.pricing.isFree ? 'Free' : `$${(event.pricing.ticketPrice * bookingForm.quantity).toFixed(2)}`}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {bookingForm.quantity} ticket{bookingForm.quantity > 1 ? 's' : ''}
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={bookingLoading}
                  style={{ minWidth: '120px' }}
                >
                  {bookingLoading ? 'Booking...' : isOnline ? 'Book Now' : 'Book Offline'}
                </button>
                {!isOnline && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: '0.5rem' }}>
                    📱 Booking will be processed when connection is restored
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      )}
      
      {!canBook && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            {!isAuthenticated ? (
              <>
                <h3>Login Required</h3>
                <p>Please log in to book tickets for this event.</p>
                <button onClick={() => navigate('/login')} className="btn btn-primary">
                  Login
                </button>
              </>
            ) : event.capacity.available === 0 ? (
              <>
                <h3>Event Full</h3>
                <p>This event has reached maximum capacity.</p>
              </>
            ) : new Date(event.dateTime.start) <= new Date() ? (
              <>
                <h3>Event Started</h3>
                <p>Booking is no longer available for this event.</p>
              </>
            ) : (
              <>
                <h3>Booking Unavailable</h3>
                <p>This event is not currently available for booking.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;