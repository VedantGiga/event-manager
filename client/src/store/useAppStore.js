import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { eventsAPI, bookingsAPI } from '../utils/api';

const useAppStore = create(
  persist(
    (set, get) => ({
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
      
      updateEvent: (eventId, updates) => set((state) => ({
        events: state.events.map(event => 
          event._id === eventId ? { ...event, ...updates } : event
        )
      })),
      
      // Bookings actions
      setBookings: (bookings) => set({ bookings }),
      setBookingsLoading: (loading) => set({ bookingsLoading: loading }),
      
      addBooking: (booking) => set((state) => ({
        bookings: [booking, ...state.bookings]
      })),
      
      updateBooking: (bookingId, updates) => set((state) => ({
        bookings: state.bookings.map(booking =>
          booking._id === bookingId ? { ...booking, ...updates } : booking
        )
      })),
      
      // Offline actions
      setOnlineStatus: (status) => set({ isOnline: status }),
      
      addPendingAction: (action) => set((state) => ({
        pendingActions: [...state.pendingActions, { ...action, id: Date.now() }]
      })),
      
      removePendingAction: (actionId) => set((state) => ({
        pendingActions: state.pendingActions.filter(action => action.id !== actionId)
      })),
      
      // API actions with offline support
      fetchEvents: async (params = {}) => {
        const { setEventsLoading, setEventsError, setEvents, setPagination, isOnline } = get();
        
        try {
          setEventsLoading(true);
          setEventsError(null);
          
          if (!isOnline) {
            // Return cached events when offline
            return;
          }
          
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
          // Queue booking for later sync
          addPendingAction({
            type: 'CREATE_BOOKING',
            data: bookingData,
            timestamp: new Date().toISOString()
          });
          
          // Add optimistic booking to local state
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
      },
      
      syncPendingActions: async () => {
        const { pendingActions, removePendingAction, isOnline } = get();
        
        if (!isOnline || pendingActions.length === 0) return;
        
        for (const action of pendingActions) {
          try {
            switch (action.type) {
              case 'CREATE_BOOKING':
                await bookingsAPI.createBooking(action.data);
                removePendingAction(action.id);
                break;
              default:
                removePendingAction(action.id);
            }
          } catch (error) {
            console.error('Failed to sync action:', action, error);
          }
        }
      }
    }),
    {
      name: 'event-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        events: state.events,
        bookings: state.bookings,
        pendingActions: state.pendingActions
      })
    }
  )
);

export default useAppStore;