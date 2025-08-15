import React, { useState, useEffect, useCallback } from 'react';
import { eventsAPI } from '../utils/api';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import useInfiniteScroll from '../hooks/useInfiniteScroll';

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    city: '',
    limit: 12
  });
  const [pagination, setPagination] = useState({});
  const [viewMode, setViewMode] = useState('pagination');

  const categories = ['conference', 'workshop', 'meetup', 'concert', 'sports', 'networking', 'seminar', 'other'];

  const fetchEvents = async (reset = true) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }
      
      // Clean query parameters - remove empty values
      const queryParams = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key].toString().trim()) {
          queryParams[key] = filters[key];
        }
      });
      
      if (!reset && pagination.nextCursor) {
        queryParams.cursor = pagination.nextCursor;
      }
      
      const response = await eventsAPI.getEvents(queryParams);
      const newEvents = response.data.data.events;
      const newPagination = response.data.data.pagination;
      
      if (reset) {
        setEvents(newEvents);
      } else {
        setEvents(prev => [...prev, ...newEvents]);
      }
      
      setPagination(newPagination);
    } catch (err) {
      setError(err);
    } finally {
      if (reset) setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(true);
  }, [filters]);
  
  const fetchMoreEvents = useCallback(async () => {
    if (pagination.hasNextPage && !loading) {
      await fetchEvents(false);
    }
  }, [pagination.hasNextPage, loading]);
  
  const [isFetchingMore] = useInfiniteScroll(fetchMoreEvents);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handlePageChange = (newPage) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    fetchEvents(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEvents(true);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Discover Events
        </h1>
        
        {/* Search and Filters */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Search Events</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by title or description..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Filter by city..."
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </div>
            </div>
          </form>
        </div>
      </div>

      {error && <ErrorMessage error={error} onRetry={() => fetchEvents(true)} />}

      {loading ? (
        <LoadingSpinner text="Loading events..." />
      ) : (
        <>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <h3>No events found</h3>
              <p>Try adjusting your search criteria or check back later for new events.</p>
            </div>
          ) : (
            <>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {events.map(event => (
                  <EventCard key={event._id} event={event} />
                ))}
              </div>

              {/* View Mode Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                <button
                  onClick={() => setViewMode('pagination')}
                  className={`btn ${viewMode === 'pagination' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Pagination
                </button>
                <button
                  onClick={() => setViewMode('infinite')}
                  className={`btn ${viewMode === 'infinite' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Infinite Scroll
                </button>
              </div>

              {/* Pagination Mode */}
              {viewMode === 'pagination' && pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="btn btn-secondary"
                    style={{ opacity: pagination.page === 1 ? 0.5 : 1 }}
                  >
                    Previous
                  </button>
                  
                  <span style={{ padding: '0 1rem', color: 'var(--text-secondary)' }}>
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="btn btn-secondary"
                    style={{ opacity: pagination.page === pagination.pages ? 0.5 : 1 }}
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Infinite Scroll Mode */}
              {viewMode === 'infinite' && pagination.hasNextPage && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  {isFetchingMore ? (
                    <LoadingSpinner size="small" text="Loading more events..." />
                  ) : (
                    <button
                      onClick={fetchMoreEvents}
                      className="btn btn-primary"
                    >
                      Load More Events
                    </button>
                  )}
                </div>
              )}

              {viewMode === 'infinite' && !pagination.hasNextPage && events.length > 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  You've reached the end of the events list.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default EventList;