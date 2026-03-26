/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plane, 
  Search, 
  Calendar, 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Briefcase, 
  Coffee, 
  Star, 
  CreditCard, 
  CheckCircle2,
  Menu,
  X,
  User,
  Armchair,
  Info,
  Share,
  LogOut,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { cn } from './lib/utils';
import { trackBookingStep, trackFlightSelection, trackPayment, trackPageView } from './lib/gtm';
import { auth, db, loginWithGoogle, logout, handleFirestoreError, OperationType, trackEvent } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6 text-center">
          <div className="max-w-md space-y-4">
            <AlertCircle className="w-16 h-16 text-burgundy mx-auto" />
            <h2 className="text-2xl font-serif text-zinc-900">Something went wrong</h2>
            <p className="text-zinc-500 text-sm">
              {this.state.error?.message.startsWith('{') 
                ? "A database error occurred. Please try again later." 
                : "An unexpected error occurred. Please refresh the page."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-burgundy text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest"
            >
              Refresh App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Types ---

type Step = 'search' | 'flights' | 'passengers' | 'seats' | 'addons' | 'payment' | 'confirmation';
type TripType = 'return' | 'oneway' | 'multicity';

interface MultiCitySegment {
  from: string;
  to: string;
  date: string;
}

interface Flight {
  id: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  class: 'Economy' | 'Business' | 'First';
}

interface Passenger {
  firstName: string;
  lastName: string;
  passportNumber: string;
  email: string;
  phone: string;
}

interface BookingData {
  tripType: TripType;
  from: string;
  to: string;
  date: string;
  returnDate: string;
  multiCitySegments: MultiCitySegment[];
  passengersCount: number;
  selectedFlight: Flight | null;
  passengers: Passenger[];
  selectedSeats: string[];
  addons: {
    baggage: boolean;
    lounge: boolean;
    alMaha: boolean;
    insurance: boolean;
  };
}

// --- Mock Data ---

const DESTINATIONS = ['Doha', 'London', 'New York', 'Tokyo', 'Paris', 'Singapore', 'Mumbai', 'Sydney'];

const MOCK_FLIGHTS: Flight[] = [
  { id: 'GA101', from: 'Mumbai', to: 'Doha', departure: '10:00 AM', arrival: '12:30 PM', duration: '4h 00m', price: 450, class: 'Economy' },
  { id: 'GA102', from: 'Mumbai', to: 'Doha', departure: '02:00 PM', arrival: '04:30 PM', duration: '4h 00m', price: 1200, class: 'Business' },
  { id: 'GA103', from: 'Mumbai', to: 'Doha', departure: '08:00 PM', arrival: '10:30 PM', duration: '4h 00m', price: 2500, class: 'First' },
];

export default function App() {
  const [step, setStep] = useState<Step>('search');
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isIOS, setIsIOS] = useState<boolean | null>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  
  const [booking, setBooking] = useState<BookingData>({
    tripType: 'return',
    from: 'Mumbai',
    to: 'Doha',
    date: '2026-04-15',
    returnDate: '2026-04-22',
    multiCitySegments: [
      { from: 'Mumbai', to: 'Doha', date: '2026-04-15' },
      { from: 'Doha', to: 'London', date: '2026-04-20' }
    ],
    passengersCount: 1,
    selectedFlight: null,
    passengers: [{ firstName: '', lastName: '', passportNumber: '', email: '', phone: '' }],
    selectedSeats: [],
    addons: {
      baggage: false,
      lounge: false,
      alMaha: false,
      insurance: false,
    }
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    trackPageView(step);
    trackBookingStep(step, { tripType: booking.tripType });
    trackEvent('page_view', { page_title: step });
  }, [step]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(ios);
    };
    checkIOS();
  }, []);

  useEffect(() => {
    if (user && isAuthReady) {
      const q = query(
        collection(db, 'bookings'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserBookings(bookings);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'bookings');
      });

      return () => unsubscribe();
    }
  }, [user, isAuthReady]);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-6 py-4 flex items-center justify-between pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => { triggerHaptic(); window.location.reload(); }}>
        <div className="w-10 h-10 bg-burgundy rounded-full flex items-center justify-center">
          <Plane className="text-white w-6 h-6 rotate-45" />
        </div>
        <span className="text-2xl font-serif italic tracking-wider text-burgundy">Gharat <span className="text-gold">Airways</span></span>
      </div>
      <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-zinc-600 font-semibold">
        <a href="#" className="hover:text-burgundy transition-colors border-b-2 border-transparent hover:border-burgundy pb-1">Book</a>
        <a href="#" className="hover:text-burgundy transition-colors border-b-2 border-transparent hover:border-burgundy pb-1">Check-in</a>
        <a href="#" className="hover:text-burgundy transition-colors border-b-2 border-transparent hover:border-burgundy pb-1">Manage</a>
        <a href="#" className="hover:text-burgundy transition-colors border-b-2 border-transparent hover:border-burgundy pb-1">Flight Status</a>
        <a href="#" className="hover:text-burgundy transition-colors border-b-2 border-transparent hover:border-burgundy pb-1">Experience</a>
      </nav>
      <div className="flex items-center gap-6">
        {!isStandalone && (
          <button 
            onClick={() => { triggerHaptic(); setShowInstallPrompt(true); }}
            className="hidden sm:flex items-center gap-2 text-gold text-xs uppercase tracking-widest font-bold hover:text-burgundy transition-colors"
          >
            <Share className="w-4 h-4" />
            <span>Install App</span>
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Privilege Club</span>
              <span className="text-xs font-semibold text-zinc-900">{user.displayName}</span>
            </div>
            <button 
              onClick={() => { triggerHaptic(); logout(); }}
              className="text-zinc-400 hover:text-burgundy transition-colors p-2"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={async () => { 
              triggerHaptic(); 
              try {
                await loginWithGoogle();
                trackEvent('login', { method: 'Google' });
              } catch (error) {
                console.error("Login failed", error);
                trackEvent('login_failed', { error: String(error) });
              }
            }}
            className="bg-burgundy text-white px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg shadow-burgundy/20 active:scale-95"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIOS && !isStandalone) {
      const hasSeenPrompt = localStorage.getItem('ios-prompt-seen');
      if (!hasSeenPrompt) {
        setShowInstallPrompt(true);
      }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    } else {
      // For iOS, we just show instructions (handled in the UI)
      localStorage.setItem('ios-prompt-seen', 'true');
      setShowInstallPrompt(false);
    }
  };

  const nextStep = () => {
    triggerHaptic();
    if (step === 'search') setStep('flights');
    else if (step === 'flights') setStep('passengers');
    else if (step === 'passengers') setStep('seats');
    else if (step === 'seats') setStep('addons');
    else if (step === 'addons') setStep('payment');
    else if (step === 'payment') setStep('confirmation');
  };

  const prevStep = () => {
    triggerHaptic();
    if (step === 'flights') setStep('search');
    else if (step === 'passengers') setStep('flights');
    else if (step === 'seats') setStep('passengers');
    else if (step === 'addons') setStep('seats');
    else if (step === 'payment') setStep('addons');
  };

  // --- Render Helpers ---

  const renderSearch = () => (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1436491865332-7a61a109c0f3?auto=format&fit=crop&q=80&w=2000" 
          alt="Hero" 
          className="w-full h-full object-cover brightness-50"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-xl p-8 rounded-3xl border border-zinc-200 shadow-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-serif italic text-burgundy mb-8 text-center">Where luxury takes flight.</h1>
        
        {/* Trip Type Selector */}
        <div className="flex items-center gap-6 mb-8 border-b border-zinc-100 pb-4">
          {(['return', 'oneway', 'multicity'] as TripType[]).map((type) => (
            <button
              key={type}
              onClick={() => setBooking({ ...booking, tripType: type })}
              className={cn(
                "text-xs uppercase tracking-[0.2em] font-bold transition-all pb-2 border-b-2",
                booking.tripType === type ? "text-burgundy border-burgundy" : "text-zinc-400 border-transparent hover:text-burgundy"
              )}
            >
              {type === 'return' ? 'Return' : type === 'oneway' ? 'One Way' : 'Multi-city'}
            </button>
          ))}
        </div>

        {booking.tripType !== 'multicity' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">From</label>
              <div className="flex items-center gap-2 text-zinc-900">
                <MapPin className="w-4 h-4 text-gold" />
                <select 
                  value={booking.from} 
                  onChange={e => setBooking({...booking, from: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                >
                  {DESTINATIONS.map(d => <option key={d} value={d} className="bg-white">{d}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">To</label>
              <div className="flex items-center gap-2 text-zinc-900">
                <MapPin className="w-4 h-4 text-gold" />
                <select 
                  value={booking.to} 
                  onChange={e => setBooking({...booking, to: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                >
                  {DESTINATIONS.map(d => <option key={d} value={d} className="bg-white">{d}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">Departure</label>
              <div className="flex items-center gap-2 text-zinc-900">
                <Calendar className="w-4 h-4 text-gold" />
                <input 
                  type="date" 
                  value={booking.date}
                  onChange={e => setBooking({...booking, date: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                />
              </div>
            </div>
            {booking.tripType === 'return' && (
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">Return</label>
                <div className="flex items-center gap-2 text-zinc-900">
                  <Calendar className="w-4 h-4 text-gold" />
                  <input 
                    type="date" 
                    value={booking.returnDate}
                    onChange={e => setBooking({...booking, returnDate: e.target.value})}
                    className="bg-transparent border-none focus:ring-0 w-full font-medium"
                  />
                </div>
              </div>
            )}
            <div className={cn(
              "bg-zinc-50 p-4 rounded-2xl border border-zinc-100",
              booking.tripType === 'oneway' ? "md:col-span-2" : ""
            )}>
              <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">Passengers</label>
              <div className="flex items-center gap-2 text-zinc-900">
                <Users className="w-4 h-4 text-gold" />
                <input 
                  type="number" 
                  min="1" 
                  max="9"
                  value={booking.passengersCount}
                  onChange={e => {
                    const count = parseInt(e.target.value);
                    setBooking({
                      ...booking, 
                      passengersCount: count,
                      passengers: Array.from({ length: count }, () => ({ firstName: '', lastName: '', passportNumber: '', email: '', phone: '' }))
                    });
                  }}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {booking.multiCitySegments.map((segment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">From</label>
                  <div className="flex items-center gap-2 text-zinc-900">
                    <MapPin className="w-4 h-4 text-gold" />
                    <select 
                      value={segment.from} 
                      onChange={e => {
                        const newSegments = [...booking.multiCitySegments];
                        newSegments[index].from = e.target.value;
                        setBooking({ ...booking, multiCitySegments: newSegments });
                      }}
                      className="bg-transparent border-none focus:ring-0 w-full font-medium"
                    >
                      {DESTINATIONS.map(d => <option key={d} value={d} className="bg-white">{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">To</label>
                  <div className="flex items-center gap-2 text-zinc-900">
                    <MapPin className="w-4 h-4 text-gold" />
                    <select 
                      value={segment.to} 
                      onChange={e => {
                        const newSegments = [...booking.multiCitySegments];
                        newSegments[index].to = e.target.value;
                        setBooking({ ...booking, multiCitySegments: newSegments });
                      }}
                      className="bg-transparent border-none focus:ring-0 w-full font-medium"
                    >
                      {DESTINATIONS.map(d => <option key={d} value={d} className="bg-white">{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">Date</label>
                  <div className="flex items-center gap-2 text-zinc-900">
                    <Calendar className="w-4 h-4 text-gold" />
                    <input 
                      type="date" 
                      value={segment.date}
                      onChange={e => {
                        const newSegments = [...booking.multiCitySegments];
                        newSegments[index].date = e.target.value;
                        setBooking({ ...booking, multiCitySegments: newSegments });
                      }}
                      className="bg-transparent border-none focus:ring-0 w-full font-medium"
                    />
                  </div>
                </div>
                {index > 1 && (
                  <button 
                    onClick={() => {
                      const newSegments = booking.multiCitySegments.filter((_, i) => i !== index);
                      setBooking({ ...booking, multiCitySegments: newSegments });
                    }}
                    className="text-zinc-400 hover:text-red-600 p-4 text-xs uppercase tracking-widest font-bold"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between items-center pt-4">
              <button 
                onClick={() => {
                  const lastSegment = booking.multiCitySegments[booking.multiCitySegments.length - 1];
                  setBooking({
                    ...booking,
                    multiCitySegments: [
                      ...booking.multiCitySegments,
                      { from: lastSegment.to, to: '', date: '' }
                    ]
                  });
                }}
                className="text-gold text-xs uppercase tracking-widest font-bold hover:text-burgundy"
              >
                + Add another flight
              </button>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 min-w-[200px]">
                <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-1">Passengers</label>
                <div className="flex items-center gap-2 text-zinc-900">
                  <Users className="w-4 h-4 text-gold" />
                  <input 
                    type="number" 
                    min="1" 
                    max="9"
                    value={booking.passengersCount}
                    onChange={e => {
                      const count = parseInt(e.target.value);
                      setBooking({
                        ...booking, 
                        passengersCount: count,
                        passengers: Array.from({ length: count }, () => ({ firstName: '', lastName: '', passportNumber: '', email: '', phone: '' }))
                      });
                    }}
                    className="bg-transparent border-none focus:ring-0 w-full font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => {
            trackBookingStep('search_completed', { 
              from: booking.from, 
              to: booking.to, 
              tripType: booking.tripType 
            });
            
            // Log flight_search event to Firebase
            trackEvent('flight_search', {
              origin: booking.from,
              destination: booking.to,
              departure_date: booking.date,
              return_date: booking.tripType === 'return' ? booking.returnDate : undefined,
              trip_type: booking.tripType,
              passengers: booking.passengersCount,
              multi_city_segments: booking.tripType === 'multicity' ? booking.multiCitySegments.length : undefined
            });

            nextStep();
          }}
          className="w-full mt-8 bg-burgundy text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-red-900 transition-all flex items-center justify-center gap-3 shadow-lg shadow-burgundy/20"
        >
          Search Flights <ChevronRight className="w-6 h-6" />
        </button>
      </motion.div>

      {/* Featured Services Section */}
      <div className="max-w-7xl w-full mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 pb-20">
        {[
          { icon: <Star />, title: "Al Maha Services", desc: "Personalized meet and assist services at Hamad International Airport." },
          { icon: <Coffee />, title: "Premium Lounges", desc: "Relax in world-class comfort before your journey." },
          { icon: <ShieldCheck />, title: "Travel Insurance", desc: "Comprehensive coverage for a worry-free travel experience." }
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl hover:bg-white hover:shadow-lg transition-all group cursor-pointer"
          >
            <div className="w-12 h-12 bg-gold/10 rounded-2xl flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <h3 className="text-xl font-serif text-zinc-900 mb-3">{item.title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderFlights = () => (
    <div className="min-h-screen bg-white pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={prevStep} className="text-zinc-500 hover:text-burgundy flex items-center gap-2 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to search
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-serif text-zinc-900">{booking.from} to {booking.to}</h2>
            <p className="text-zinc-500 text-sm">{booking.date} • {booking.passengersCount} Passenger(s)</p>
          </div>
        </div>

        <div className="space-y-4">
          {MOCK_FLIGHTS.map((flight) => (
            <motion.div 
              key={flight.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => {
                setBooking({...booking, selectedFlight: flight});
                trackFlightSelection(flight);
                nextStep();
              }}
              className="bg-zinc-50 border border-zinc-100 p-6 rounded-3xl hover:border-gold/50 transition-all cursor-pointer group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-12 flex-1">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-zinc-900">{flight.departure}</p>
                    <p className="text-zinc-500 text-sm">{flight.from}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest">{flight.duration}</p>
                    <div className="w-full h-px bg-zinc-200 relative">
                      <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gold w-4 h-4 rotate-90" />
                    </div>
                    <p className="text-zinc-400 text-xs">Direct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-zinc-900">{flight.arrival}</p>
                    <p className="text-zinc-500 text-sm">{flight.to}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 pl-8 border-l border-zinc-100">
                  <div className="text-right">
                    <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">{flight.class}</p>
                    <p className="text-3xl font-bold text-gold">${flight.price}</p>
                  </div>
                  <div className="w-12 h-12 bg-burgundy rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg shadow-burgundy/20">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPassengers = () => (
    <div className="min-h-screen bg-white pt-32 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={prevStep} className="text-zinc-500 hover:text-burgundy flex items-center gap-2 mb-8 transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back to flights
        </button>
        <h2 className="text-4xl font-serif text-zinc-900 mb-8">Passenger Details</h2>
        
        <div className="space-y-8">
          {booking.passengers.map((p, i) => (
            <div key={i} className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl space-y-6 shadow-sm">
              <h3 className="text-burgundy font-medium flex items-center gap-2">
                <User className="w-5 h-5" /> Passenger {i + 1}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">First Name</label>
                  <input 
                    type="text"
                    placeholder="As in passport"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                    value={p.firstName}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, firstName: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Last Name</label>
                  <input 
                    type="text"
                    placeholder="As in passport"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                    value={p.lastName}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, lastName: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Passport Number</label>
                  <input 
                    type="text"
                    placeholder="Enter passport number"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                    value={p.passportNumber}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, passportNumber: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Email Address</label>
                  <input 
                    type="email"
                    placeholder="email@example.com"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                    value={p.email}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, email: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Phone Number</label>
                  <input 
                    type="tel"
                    placeholder="+1 234 567 890"
                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                    value={p.phone}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, phone: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={nextStep}
          className="w-full mt-12 bg-burgundy text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-red-900 transition-all shadow-lg shadow-burgundy/20"
        >
          Select Seats
        </button>
      </div>
    </div>
  );

  const renderSeats = () => {
    const rows = 10;
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={prevStep} className="text-zinc-500 hover:text-burgundy flex items-center gap-2 mb-8 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to passengers
          </button>
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div className="flex-1">
              <h2 className="text-4xl font-serif text-zinc-900 mb-4">Select Your Seat</h2>
              <p className="text-zinc-500 mb-8">Choose your preferred seat for a comfortable journey.</p>
              
              <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl overflow-x-auto shadow-sm">
                <div className="min-w-[400px] flex flex-col items-center gap-4">
                  <div className="w-full h-12 bg-zinc-200/50 rounded-t-[100px] border-x border-t border-zinc-200 flex items-center justify-center text-zinc-400 text-xs uppercase tracking-widest">Cockpit</div>
                  
                  {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex items-center gap-4">
                      <div className="w-6 text-zinc-400 text-xs font-mono">{r + 1}</div>
                      <div className="flex items-center gap-2">
                        {cols.map((c, i) => {
                          const seatId = `${r + 1}${c}`;
                          const isSelected = booking.selectedSeats.includes(seatId);
                          const isOccupied = Math.random() < 0.2; // Mock occupied seats
                          
                          return (
                            <React.Fragment key={c}>
                              <button
                                disabled={isOccupied}
                                onClick={() => {
                                  let newSeats = [...booking.selectedSeats];
                                  if (isSelected) {
                                    newSeats = newSeats.filter(s => s !== seatId);
                                  } else if (newSeats.length < booking.passengersCount) {
                                    newSeats.push(seatId);
                                  }
                                  setBooking({ ...booking, selectedSeats: newSeats });
                                }}
                                className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                                  isOccupied ? "bg-zinc-200 text-zinc-400 cursor-not-allowed" : 
                                  isSelected ? "bg-gold text-white shadow-lg shadow-gold/20" : 
                                  "bg-white border border-zinc-200 text-zinc-400 hover:border-burgundy hover:text-burgundy"
                                )}
                              >
                                <Armchair className="w-5 h-5" />
                              </button>
                              {i === 2 && <div className="w-8" />} {/* Aisle */}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 space-y-6">
              <div className="bg-zinc-50 border border-zinc-100 p-6 rounded-3xl shadow-sm">
                <h3 className="text-zinc-900 font-medium mb-4">Selection Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Passengers</span>
                    <span className="text-zinc-900 font-medium">{booking.passengersCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Seats Selected</span>
                    <span className="text-zinc-900 font-medium">{booking.selectedSeats.join(', ') || 'None'}</span>
                  </div>
                </div>
              </div>
              
              <button 
                disabled={booking.selectedSeats.length < booking.passengersCount}
                onClick={nextStep}
                className="w-full bg-burgundy text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-burgundy/20"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAddons = () => (
    <div className="min-h-screen bg-white pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={prevStep} className="text-zinc-500 hover:text-burgundy flex items-center gap-2 mb-8 transition-colors">
          <ChevronLeft className="w-5 h-5" /> Back to seats
        </button>
        <h2 className="text-4xl font-serif text-zinc-900 mb-4">Enhance Your Journey</h2>
        <p className="text-zinc-500 mb-12">Add premium services for a truly exceptional experience.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { id: 'baggage', icon: <Briefcase />, title: "Extra Baggage", price: 45, desc: "Add up to 10kg extra for your souvenirs." },
            { id: 'lounge', icon: <Coffee />, title: "Lounge Access", price: 60, desc: "Relax in the Al Mourjan Business Lounge." },
            { id: 'alMaha', icon: <Star />, title: "Al Maha Services", price: 35, desc: "Personalized meet and assist at the airport." },
            { id: 'insurance', icon: <ShieldCheck />, title: "Travel Insurance", price: 25, desc: "Comprehensive medical and trip coverage." }
          ].map((item) => (
            <div 
              key={item.id}
              onClick={() => {
                setBooking({
                  ...booking,
                  addons: { ...booking.addons, [item.id]: !booking.addons[item.id as keyof typeof booking.addons] }
                });
              }}
              className={cn(
                "p-8 rounded-3xl border transition-all cursor-pointer flex items-start gap-6 shadow-sm",
                booking.addons[item.id as keyof typeof booking.addons] 
                  ? "bg-burgundy/5 border-burgundy" 
                  : "bg-zinc-50 border-zinc-100 hover:border-burgundy/30"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                booking.addons[item.id as keyof typeof booking.addons] ? "bg-burgundy text-white" : "bg-white border border-zinc-200 text-gold"
              )}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-medium text-zinc-900">{item.title}</h3>
                  <span className="text-gold font-bold">${item.price}</span>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={nextStep}
          className="w-full mt-12 bg-burgundy text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-red-900 transition-all shadow-lg shadow-burgundy/20"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  );  const handlePayment = async () => {
    if (!user) {
      loginWithGoogle();
      return;
    }

    try {
      triggerHaptic();
      const bookingPayload = {
        uid: user.uid,
        tripType: booking.tripType,
        from: booking.from,
        to: booking.to,
        date: booking.date,
        returnDate: booking.returnDate || null,
        passengersCount: booking.passengersCount,
        flightId: booking.selectedFlight?.id || null,
        price: (booking.selectedFlight?.price || 0) * booking.passengersCount,
        status: 'confirmed',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), bookingPayload);
      trackPayment(bookingPayload.price);
      nextStep();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    }
  };

  const renderPayment = () => {
    const flightPrice = (booking.selectedFlight?.price || 0) * booking.passengersCount;
    const addonsPrice = (booking.addons.baggage ? 45 : 0) + (booking.addons.lounge ? 60 : 0) + (booking.addons.alMaha ? 35 : 0) + (booking.addons.insurance ? 25 : 0);
    const total = flightPrice + addonsPrice;

    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={prevStep} className="text-zinc-500 hover:text-burgundy flex items-center gap-2 mb-8 transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to add-ons
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <h2 className="text-4xl font-serif text-zinc-900 mb-8">Payment</h2>
              
              <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl space-y-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-8 bg-white border border-zinc-200 rounded flex items-center justify-center text-[10px] text-zinc-400 font-bold">VISA</div>
                  <div className="w-12 h-8 bg-white border border-zinc-200 rounded flex items-center justify-center text-[10px] text-zinc-400 font-bold">MASTER</div>
                  <div className="w-12 h-8 bg-white border border-zinc-200 rounded flex items-center justify-center text-[10px] text-zinc-400 font-bold">AMEX</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 w-5 h-5" />
                      <input 
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-white border border-zinc-200 rounded-xl pl-12 pr-4 py-4 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">Expiry Date</label>
                      <input 
                        type="text"
                        placeholder="MM/YY"
                        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-4 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">CVV</label>
                      <input 
                        type="text"
                        placeholder="123"
                        className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-4 text-zinc-900 focus:border-burgundy focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-zinc-400 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>Your payment is secured with 256-bit SSL encryption. By clicking 'Pay Now', you agree to our Terms of Carriage and Privacy Policy.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-3xl shadow-sm">
                <h3 className="text-zinc-900 font-medium mb-6">Price Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Flight ({booking.passengersCount}x)</span>
                    <span className="text-zinc-900 font-medium">${flightPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Add-ons</span>
                    <span className="text-zinc-900 font-medium">${addonsPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Taxes & Fees</span>
                    <span className="text-zinc-900 font-medium">$85</span>
                  </div>
                  <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
                    <span className="text-zinc-900 font-bold">Total</span>
                    <span className="text-3xl font-bold text-gold">${total + 85}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handlePayment}
                className="w-full bg-burgundy text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-red-900 transition-all shadow-lg shadow-burgundy/20"
              >
                {user ? 'Pay Now' : 'Login to Pay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    const selectedAddons = Object.entries(booking.addons)
      .filter(([_, value]) => value)
      .map(([key]) => {
        const labels: Record<string, string> = {
          baggage: "Extra Baggage",
          lounge: "Lounge Access",
          alMaha: "Al Maha Services",
          insurance: "Travel Insurance"
        };
        return labels[key];
      });

    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-50 border border-zinc-100 p-8 md:p-12 rounded-[40px] shadow-xl"
          >
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-serif text-zinc-900 mb-4">Booking Confirmed!</h2>
              <p className="text-zinc-500">Your journey with Gharat Airways is ready. A confirmation email has been sent to {booking.passengers[0].email}.</p>
            </div>
            
            <div className="space-y-8">
              {/* Reference Number */}
              <div className="flex justify-between items-center py-4 border-b border-zinc-200">
                <span className="text-zinc-400 text-xs uppercase tracking-widest">Booking Reference</span>
                <span className="text-gold font-mono font-bold text-xl">GA-77X92B</span>
              </div>

              {/* Flight Details */}
              <div className="space-y-4">
                <h3 className="text-burgundy font-medium flex items-center gap-2">
                  <Plane className="w-5 h-5" /> Flight Information
                </h3>
                <div className="bg-white border border-zinc-100 p-6 rounded-3xl grid grid-cols-2 md:grid-cols-4 gap-6 shadow-sm">
                  <div>
                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Flight</p>
                    <p className="text-zinc-900 font-bold">{booking.selectedFlight?.id}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Class</p>
                    <p className="text-zinc-900 font-bold">{booking.selectedFlight?.class}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">From</p>
                    <p className="text-zinc-900 font-bold">{booking.from}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">To</p>
                    <p className="text-zinc-900 font-bold">{booking.to}</p>
                  </div>
                </div>
              </div>

              {/* Passenger Details */}
              <div className="space-y-4">
                <h3 className="text-burgundy font-medium flex items-center gap-2">
                  <Users className="w-5 h-5" /> Passenger Details
                </h3>
                <div className="space-y-4">
                  {booking.passengers.map((p, i) => (
                    <div key={i} className="bg-white border border-zinc-100 p-6 rounded-3xl shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Name</p>
                          <p className="text-zinc-900 font-bold">{p.firstName} {p.lastName}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Passport</p>
                          <p className="text-zinc-900 font-bold">{p.passportNumber}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Email</p>
                          <p className="text-zinc-900 font-medium">{p.email}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Phone</p>
                          <p className="text-zinc-900 font-medium">{p.phone}</p>
                        </div>
                        <div>
                          <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Seat</p>
                          <p className="text-gold font-bold">{booking.selectedSeats[i] || 'Not assigned'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add-ons */}
              {selectedAddons.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-burgundy font-medium flex items-center gap-2">
                    <Star className="w-5 h-5" /> Selected Add-ons
                  </h3>
                  <div className="bg-white border border-zinc-100 p-6 rounded-3xl flex flex-wrap gap-3 shadow-sm">
                    {selectedAddons.map(addon => (
                      <span key={addon} className="bg-zinc-50 text-zinc-600 px-4 py-2 rounded-full text-sm border border-zinc-100">
                        {addon}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full mt-12 bg-burgundy text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-red-900 transition-all shadow-lg shadow-burgundy/20"
            >
              Return Home
            </button>
          </motion.div>
        </div>
      </div>
    );
  };

  if (isIOS === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-burgundy p-6 text-center text-white">
        <div className="max-w-md space-y-6">
          <Smartphone className="w-20 h-20 mx-auto" />
          <h1 className="text-4xl font-serif italic">Gharat Airways</h1>
          <p className="text-xl font-light">
            Our premium experience is currently exclusive to iOS devices.
          </p>
          <p className="text-sm opacity-70">
            Please visit us from an iPhone or iPad to experience the world's best airline app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white text-zinc-900 selection:bg-gold/30">
        <Header />
        
        <AnimatePresence mode="wait">
          <motion.main
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="pb-[env(safe-area-inset-bottom)]"
          >
            {step === 'search' && renderSearch()}
            {step === 'flights' && renderFlights()}
            {step === 'passengers' && renderPassengers()}
            {step === 'seats' && renderSeats()}
            {step === 'addons' && renderAddons()}
            {step === 'payment' && renderPayment()}
            {step === 'confirmation' && renderConfirmation()}
          </motion.main>
        </AnimatePresence>

      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-6 right-6 z-[100] bg-white border border-zinc-200 p-6 rounded-3xl shadow-2xl flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-burgundy rounded-2xl flex items-center justify-center">
                  <Plane className="text-white w-6 h-6 rotate-45" />
                </div>
                <div>
                  <h4 className="text-zinc-900 font-bold">Install Gharat Airways</h4>
                  <p className="text-zinc-500 text-xs">Add to home screen for the full luxury experience.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowInstallPrompt(false);
                  localStorage.setItem('ios-prompt-seen', 'true');
                }}
                className="text-zinc-300 p-1 hover:text-burgundy transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-600 bg-zinc-50 p-3 rounded-xl">
              {deferredPrompt ? (
                <button 
                  onClick={() => { triggerHaptic(); handleInstall(); }}
                  className="w-full bg-burgundy text-white py-3 rounded-xl font-bold uppercase tracking-widest"
                >
                  Install Now
                </button>
              ) : (
                <span>Tap the share icon <Share className="w-4 h-4 inline mx-1" /> and then "Add to Home Screen"</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-zinc-50 border-t border-zinc-200 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-burgundy rounded-full flex items-center justify-center">
                <Plane className="text-white w-4 h-4 rotate-45" />
              </div>
              <span className="text-xl font-serif italic tracking-wider text-burgundy">Gharat Airways</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">Experience the world like never before with our award-winning service and luxury fleet.</p>
          </div>
          <div>
            <h4 className="text-zinc-900 font-medium mb-6 uppercase tracking-widest text-xs">Gharat Airways</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-burgundy transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Press Releases</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Sponsorships</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-900 font-medium mb-6 uppercase tracking-widest text-xs">Group Companies</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-burgundy transition-colors">Hamad International Airport</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Gharat Duty Free</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Gharat Executive</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Gharat Cargo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-zinc-900 font-medium mb-6 uppercase tracking-widest text-xs">Business Solutions</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-burgundy transition-colors">Corporate Travel</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Beyond Business</a></li>
              <li><a href="#" className="hover:text-burgundy transition-colors">Meetings and Events</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-400 text-xs">© 2026 Gharat Airways. All rights reserved.</p>
          <div className="flex gap-6 text-zinc-400 text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-zinc-900 transition-colors">Cookie Policy</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Legal</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
