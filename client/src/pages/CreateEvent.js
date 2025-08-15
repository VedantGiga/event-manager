import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import ErrorMessage from '../components/ErrorMessage';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { isOrganizer } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'conference',
    venue: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    },
    dateTime: {
      start: '',
      end: '',
      timezone: 'UTC'
    },
    capacity: {
      total: 50,
      reserved: 0
    },
    pricing: {
      isFree: true,
      ticketPrice: 0,
      currency: 'USD'
    },
    images: [''],
    tags: [''],
    isPublic: true,
    requiresApproval: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = ['conference', 'workshop', 'meetup', 'concert', 'sports', 'networking', 'seminar', 'other'];

  if (!isOrganizer) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>Access Denied</h2>
        <p>You need organizer privileges to create events.</p>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Clean up data
      const cleanData = {
        ...formData,
        images: formData.images.filter(img => img.trim()),
        tags: formData.tags.filter(tag => tag.trim()),
        capacity: {
          ...formData.capacity,
          total: parseInt(formData.capacity.total),
          reserved: parseInt(formData.capacity.reserved)
        },
        pricing: {
          ...formData.pricing,
          ticketPrice: formData.pricing.isFree ? 0 : parseFloat(formData.pricing.ticketPrice)
        }
      };
      
      const response = await eventsAPI.createEvent(cleanData);
      navigate(`/events/${response.data.data.event._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Create New Event
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Fill in the details below to create your event
        </p>
      </div>

      {error && <ErrorMessage error={error} />}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Basic Information
          </h2>
          
          <div className="form-group">
            <label className="form-label">Event Title *</label>
            <input
              type="text"
              name="title"
              className="form-input"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              name="description"
              className="form-input form-textarea"
              required
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your event..."
              rows="4"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                name="category"
                className="form-input"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  style={{ marginRight: '0.5rem' }}
                />
                Public Event
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                <input
                  type="checkbox"
                  name="requiresApproval"
                  checked={formData.requiresApproval}
                  onChange={handleChange}
                  style={{ marginRight: '0.5rem' }}
                />
                Requires Approval
              </label>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Date & Time
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Start Date & Time *</label>
              <input
                type="datetime-local"
                name="dateTime.start"
                className="form-input"
                required
                value={formData.dateTime.start}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date & Time *</label>
              <input
                type="datetime-local"
                name="dateTime.end"
                className="form-input"
                required
                value={formData.dateTime.end}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Venue Information
          </h2>
          
          <div className="form-group">
            <label className="form-label">Venue Name *</label>
            <input
              type="text"
              name="venue.name"
              className="form-input"
              required
              value={formData.venue.name}
              onChange={handleChange}
              placeholder="Enter venue name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address *</label>
            <input
              type="text"
              name="venue.address"
              className="form-input"
              required
              value={formData.venue.address}
              onChange={handleChange}
              placeholder="Enter venue address"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input
                type="text"
                name="venue.city"
                className="form-input"
                required
                value={formData.venue.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>

            <div className="form-group">
              <label className="form-label">State</label>
              <input
                type="text"
                name="venue.state"
                className="form-input"
                value={formData.venue.state}
                onChange={handleChange}
                placeholder="State"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Zip Code</label>
              <input
                type="text"
                name="venue.zipCode"
                className="form-input"
                value={formData.venue.zipCode}
                onChange={handleChange}
                placeholder="Zip Code"
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Capacity & Pricing
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Total Capacity *</label>
              <input
                type="number"
                name="capacity.total"
                className="form-input"
                required
                min="1"
                value={formData.capacity.total}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reserved Seats</label>
              <input
                type="number"
                name="capacity.reserved"
                className="form-input"
                min="0"
                value={formData.capacity.reserved}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <input
                type="checkbox"
                name="pricing.isFree"
                checked={formData.pricing.isFree}
                onChange={handleChange}
                style={{ marginRight: '0.5rem' }}
              />
              Free Event
            </label>
          </div>

          {!formData.pricing.isFree && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Ticket Price *</label>
                <input
                  type="number"
                  name="pricing.ticketPrice"
                  className="form-input"
                  required={!formData.pricing.isFree}
                  min="0"
                  step="0.01"
                  value={formData.pricing.ticketPrice}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  name="pricing.currency"
                  className="form-input"
                  value={formData.pricing.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            Additional Details
          </h2>
          
          <div className="form-group">
            <label className="form-label">Event Images (URLs)</label>
            {formData.images.map((image, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="url"
                  className="form-input"
                  value={image}
                  onChange={(e) => handleArrayChange('images', index, e.target.value)}
                  placeholder="Enter image URL"
                />
                {formData.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('images', index)}
                    className="btn btn-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('images')}
              className="btn btn-secondary"
            >
              Add Image
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Tags</label>
            {formData.tags.map((tag, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={tag}
                  onChange={(e) => handleArrayChange('tags', index, e.target.value)}
                  placeholder="Enter tag"
                />
                {formData.tags.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('tags', index)}
                    className="btn btn-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('tags')}
              className="btn btn-secondary"
            >
              Add Tag
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating Event...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEvent;