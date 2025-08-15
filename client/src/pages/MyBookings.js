import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const MyBookings = () => {
  const { isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingsAPI.getMyBookings();
      setBookings(response.data.data.bookings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setCancelLoading(prev => ({ ...prev, [bookingId]: true }));
      await bookingsAPI.cancelBooking(bookingId, 'Cancelled by user');
      await fetchBookings(); // Refresh bookings
    } catch (err) {
      alert('Failed to cancel booking: ' + (err.response?.data?.error || err.message));
    } finally {
      setCancelLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'var(--success)';
      case 'pending': return 'var(--warning)';
      case 'cancelled': return 'var(--error)';
      case 'waitlisted': return 'var(--secondary)';
      default: return 'var(--secondary)';
    }
  };

  const canCancelBooking = (booking) => {
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      return false;
    }
    
    const eventStart = new Date(booking.eventId.dateTime.start);
    const now = new Date();
    const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);
    
    return hoursUntilEvent > 24;
  };

  if (!isAuthenticated) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Please Log In</h2>
        <p>You need to be logged in to view your bookings.</p>
        <Link to="/login" className="btn btn-primary">
          Log In
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading your bookings..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchBookings} />;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          My Bookings
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage your event bookings and tickets
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Bookings Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            You haven't booked any events yet. Discover amazing events to attend!
          </p>
          <Link to="/" className="btn btn-primary">
            Browse Events
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {bookings.map(booking => (
            <div key={booking._id} className="card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      <Link 
                        to={`/events/${booking.eventId._id}`}
                        style={{ textDecoration: 'none', color: 'var(--text-primary)' }}
                      >
                        {booking.eventId.title}
                      </Link>
                    </h3>
                    <span 
                      style={{ 
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        backgroundColor: getStatusColor(booking.status),
                        color: 'white',
                        fontWeight: '500'
                      }}
                    >
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span>📅</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {formatDate(booking.eventId.dateTime.start)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span>📍</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {booking.eventId.venue.name}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🎫</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {booking.quantity} ticket{booking.quantity > 1 ? 's' : ''} • ${booking.totalAmount}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>Booking Reference:</strong> {booking.bookingReference}
                      </div>
                      <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        <strong>Booked:</strong> {formatDate(booking.createdAt)}
                      </div>
                      {booking.status === 'confirmed' && (
                        <div style={{ fontSize: '0.875rem' }}>
                          <strong>Check-in:</strong> {booking.checkInStatus === 'checked_in' ? '✅ Checked In' : '⏳ Not Checked In'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {booking.attendeeInfo.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                        Attendees:
                      </h4>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {booking.attendeeInfo.map((attendee, index) => (
                          <div key={index}>
                            {attendee.firstName} {attendee.lastName} ({attendee.email})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Link 
                    to={`/events/${booking.eventId._id}`}
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none', textAlign: 'center' }}
                  >
                    View Event
                  </Link>
                  
                  {canCancelBooking(booking) && (
                    <button
                      onClick={() => handleCancelBooking(booking._id)}
                      disabled={cancelLoading[booking._id]}
                      className="btn btn-danger"
                    >
                      {cancelLoading[booking._id] ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                  
                  {booking.status === 'cancelled' && booking.cancelReason && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--error)', 
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '0.25rem'
                    }}>
                      <strong>Cancelled:</strong> {booking.cancelReason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;