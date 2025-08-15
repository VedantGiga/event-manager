import { create } from 'zustand';
import { eventsAPI, bookingsAPI } from '../utils/api';

const useAppStore = create((set, get) => ({
  // Events state
  events: [],
  eventsLoading: false,
  eventsError: null,
  eventsPagination: {},
  
  // Bookings state
  bookings: [],
  bookingsLoading: false,
  
  // Offline state
  isOnline: navigator.onLine,
  pendingActions: [],
  
  // Events actions
  setEvents: (events) => set({ events }),
  setEventsLoading: (loading) => set({ eventsLoading: loading }),
  setEventsError: (error) => set({ eventsError: error }),
  setPagination: (pagination) => set({ eventsPagination: pagination }),
  
  addEvents: (newEvents) => set((state) => ({
    events: [...state.events, ...newEvents]
  })),
  
  // Bookings actions
  setBookings: (bookings) => set({ bookings }),
  addBooking: (booking) => set((state) => ({
    bookings: [booking, ...state.bookings]
  })),
  
  // Offline actions
  setOnlineStatus: (status) => set({ isOnline: status }),
  
  addPendingAction: (action) => set((state) => ({
    pendingActions: [...state.pendingActions, { ...action, id: Date.now() }]
  })),
  
  // API actions
  fetchEvents: async (params = {}) => {
    const { setEventsLoading, setEventsError, setEvents, setPagination, isOnline } = get();
    
    try {
      setEventsLoading(true);
      setEventsError(null);
      
      if (!isOnline) return;
      
      const response = await eventsAPI.getEvents(params);
      setEvents(response.data.data.events);
      setPagination(response.data.data.pagination);
    } catch (error) {
      setEventsError(error);
    } finally {
      setEventsLoading(false);
    }
  },
  
  createBooking: async (bookingData) => {
    const { isOnline, addPendingAction, addBooking } = get();
    
    if (!isOnline) {
      addPendingAction({
        type: 'CREATE_BOOKING',
        data: bookingData,
        timestamp: new Date().toISOString()
      });
      
      const optimisticBooking = {
        _id: `temp_${Date.now()}`,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };
      addBooking(optimisticBooking);
      
      return { success: true, booking: optimisticBooking };
    }
    
    try {
      const response = await bookingsAPI.createBooking(bookingData);
      addBooking(response.data.data.booking);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}));

export default useAppStore;