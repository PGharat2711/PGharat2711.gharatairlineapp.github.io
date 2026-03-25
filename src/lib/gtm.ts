/**
 * Google Tag Manager (GTM) Utility
 */

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export const pushToDataLayer = (event: string, data: Record<string, any> = {}) => {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};

export const trackPageView = (pagePath: string) => {
  pushToDataLayer('page_view', { page_path: pagePath });
};

export const trackBookingStep = (step: string, bookingData?: any) => {
  pushToDataLayer('booking_step', { step, ...bookingData });
};

export const trackFlightSelection = (flight: any) => {
  pushToDataLayer('select_flight', { flight_id: flight.id, flight_price: flight.price });
};

export const trackPayment = (amount: number, currency: string = 'USD') => {
  pushToDataLayer('purchase', { amount, currency });
};
