import React from 'react';
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
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
      case 'published': return 'var(--success)';
      case 'draft': return 'var(--warning)';
      case 'cancelled': return 'var(--error)';
      default: return 'var(--secondary)';
    }
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {event.images && event.images[0] && (
        <img 
          src={event.images[0]} 
          alt={event.title}
          style={{ 
            width: '100%', 
            height: '200px', 
            objectFit: 'cover', 
            borderRadius: '0.375rem',
            marginBottom: '1rem'
          }}
        />
      )}
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', margin: 0, flex: 1 }}>
            {event.title}
          </h3>
          <span 
            style={{ 
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: getStatusColor(event.status),
              color: 'white',
              marginLeft: '0.5rem'
            }}
          >
            {event.status}
          </span>
        </div>
        
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '0.875rem', 
          marginBottom: '1rem',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical'
        }}>
          {event.description}
        </p>
        
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem' }}>📅</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {formatDate(event.dateTime.start)}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem' }}>📍</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {event.venue.name}, {event.venue.city}
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem' }}>🎫</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {event.pricing.isFree ? 'Free' : `$${event.pricing.ticketPrice}`}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              • {event.capacity.available}/{event.capacity.total} available
            </span>
          </div>
        </div>
        
        {event.tags && event.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1rem' }}>
            {event.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.125rem 0.5rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  borderRadius: '0.25rem',
                  border: '1px solid var(--border)'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        <div style={{ marginTop: 'auto' }}>
          <Link 
            to={`/events/${event._id}`} 
            className="btn btn-primary"
            style={{ 
              textDecoration: 'none', 
              width: '100%',
              textAlign: 'center'
            }}
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;