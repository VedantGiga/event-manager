import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const MyEvents = () => {
  const { isOrganizer } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOrganizer) {
      fetchMyEvents();
    }
  }, [isOrganizer, filter]);

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await eventsAPI.getMyEvents(params);
      setEvents(response.data.data.events);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      await eventsAPI.publishEvent(eventId);
      fetchMyEvents(); // Refresh events
    } catch (err) {
      alert('Failed to publish event: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancelEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to cancel this event?')) {
      return;
    }

    try {
      await eventsAPI.cancelEvent(eventId);
      fetchMyEvents(); // Refresh events
    } catch (err) {
      alert('Failed to cancel event: ' + (err.response?.data?.error || err.message));
    }
  };

  if (!isOrganizer) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Access Denied</h2>
        <p>You need organizer privileges to view this page.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading your events..." />;
  if (error) return <ErrorMessage error={error} onRetry={fetchMyEvents} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            My Events
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage your events and track bookings
          </p>
        </div>
        <Link to="/create-event" className="btn btn-primary">
          Create New Event
        </Link>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['all', 'draft', 'published', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`btn ${filter === status ? 'btn-primary' : 'btn-secondary'}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3>No Events Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {filter === 'all' 
              ? "You haven't created any events yet. Start by creating your first event!"
              : `No ${filter} events found.`
            }
          </p>
          {filter === 'all' && (
            <Link to="/create-event" className="btn btn-primary">
              Create Your First Event
            </Link>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '1.5rem'
        }}>
          {events.map(event => (
            <div key={event._id} style={{ position: 'relative' }}>
              <EventCard event={event} />
              
              {/* Action Buttons */}
              <div style={{ 
                position: 'absolute', 
                top: '1rem', 
                right: '1rem',
                display: 'flex',
                gap: '0.5rem'
              }}>
                {event.status === 'draft' && (
                  <button
                    onClick={() => handlePublishEvent(event._id)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Publish
                  </button>
                )}
                
                {(event.status === 'published' || event.status === 'draft') && (
                  <button
                    onClick={() => handleCancelEvent(event._id)}
                    className="btn btn-danger"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {/* Booking Stats */}
              {event.status === 'published' && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '4rem', 
                  left: '1rem', 
                  right: '1rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem'
                }}>
                  <div>Bookings: {event.bookingCount || 0}</div>
                  <div>Available: {event.capacity.available}/{event.capacity.total}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEvents;