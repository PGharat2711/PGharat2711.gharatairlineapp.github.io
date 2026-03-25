/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { cn } from './lib/utils';

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

// --- Components ---

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
      <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
        <Plane className="text-white w-6 h-6 rotate-45" />
      </div>
      <span className="text-2xl font-serif italic tracking-wider text-white">Gharat <span className="text-amber-500">Airways</span></span>
    </div>
    <nav className="hidden lg:flex items-center gap-8 text-xs uppercase tracking-[0.2em] text-white/70 font-semibold">
      <a href="#" className="hover:text-amber-500 transition-colors border-b-2 border-transparent hover:border-amber-500 pb-1">Book</a>
      <a href="#" className="hover:text-amber-500 transition-colors border-b-2 border-transparent hover:border-amber-500 pb-1">Check-in</a>
      <a href="#" className="hover:text-amber-500 transition-colors border-b-2 border-transparent hover:border-amber-500 pb-1">Manage</a>
      <a href="#" className="hover:text-amber-500 transition-colors border-b-2 border-transparent hover:border-amber-500 pb-1">Flight Status</a>
      <a href="#" className="hover:text-amber-500 transition-colors border-b-2 border-transparent hover:border-amber-500 pb-1">Experience</a>
    </nav>
    <div className="flex items-center gap-6">
      <div className="hidden sm:flex items-center gap-2 text-white/50 text-xs uppercase tracking-widest">
        <User className="w-4 h-4" />
        <span>Privilege Club</span>
      </div>
      <button className="bg-amber-600 text-white px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95">Login</button>
    </div>
  </header>
);

export default function App() {
  const [step, setStep] = useState<Step>('search');
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
    passengers: [{ firstName: '', lastName: '', passportNumber: '' }],
    selectedSeats: [],
    addons: {
      baggage: false,
      lounge: false,
      alMaha: false,
      insurance: false,
    }
  });

  const nextStep = () => {
    if (step === 'search') setStep('flights');
    else if (step === 'flights') setStep('passengers');
    else if (step === 'passengers') setStep('seats');
    else if (step === 'seats') setStep('addons');
    else if (step === 'addons') setStep('payment');
    else if (step === 'payment') setStep('confirmation');
  };

  const prevStep = () => {
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
        className="relative z-10 w-full max-w-5xl bg-black/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl"
      >
        <h1 className="text-5xl md:text-7xl font-serif italic text-white mb-8 text-center">Where luxury takes flight.</h1>
        
        {/* Trip Type Selector */}
        <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-4">
          {(['return', 'oneway', 'multicity'] as TripType[]).map((type) => (
            <button
              key={type}
              onClick={() => setBooking({ ...booking, tripType: type })}
              className={cn(
                "text-xs uppercase tracking-[0.2em] font-bold transition-all pb-2 border-b-2",
                booking.tripType === type ? "text-amber-500 border-amber-500" : "text-white/40 border-transparent hover:text-white"
              )}
            >
              {type === 'return' ? 'Return' : type === 'oneway' ? 'One Way' : 'Multi-city'}
            </button>
          ))}
        </div>

        {booking.tripType !== 'multicity' ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
              <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">From</label>
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4 text-amber-500" />
                <select 
                  value={booking.from} 
                  onChange={e => setBooking({...booking, from: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                >
                  {DESTINATIONS.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
              <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">To</label>
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-4 h-4 text-amber-500" />
                <select 
                  value={booking.to} 
                  onChange={e => setBooking({...booking, to: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                >
                  {DESTINATIONS.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                </select>
              </div>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
              <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">Departure</label>
              <div className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-amber-500" />
                <input 
                  type="date" 
                  value={booking.date}
                  onChange={e => setBooking({...booking, date: e.target.value})}
                  className="bg-transparent border-none focus:ring-0 w-full font-medium"
                />
              </div>
            </div>
            {booking.tripType === 'return' && (
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">Return</label>
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 text-amber-500" />
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
              "bg-white/10 p-4 rounded-2xl border border-white/20",
              booking.tripType === 'oneway' ? "md:col-span-2" : ""
            )}>
              <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">Passengers</label>
              <div className="flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-amber-500" />
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
                      passengers: Array(count).fill({ firstName: '', lastName: '', passportNumber: '' })
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
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                  <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">From</label>
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <select 
                      value={segment.from} 
                      onChange={e => {
                        const newSegments = [...booking.multiCitySegments];
                        newSegments[index].from = e.target.value;
                        setBooking({ ...booking, multiCitySegments: newSegments });
                      }}
                      className="bg-transparent border-none focus:ring-0 w-full font-medium"
                    >
                      {DESTINATIONS.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                  <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">To</label>
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <select 
                      value={segment.to} 
                      onChange={e => {
                        const newSegments = [...booking.multiCitySegments];
                        newSegments[index].to = e.target.value;
                        setBooking({ ...booking, multiCitySegments: newSegments });
                      }}
                      className="bg-transparent border-none focus:ring-0 w-full font-medium"
                    >
                      {DESTINATIONS.map(d => <option key={d} value={d} className="bg-zinc-900">{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                  <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">Date</label>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-amber-500" />
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
                    className="text-white/40 hover:text-red-500 p-4 text-xs uppercase tracking-widest font-bold"
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
                className="text-amber-500 text-xs uppercase tracking-widest font-bold hover:text-amber-400"
              >
                + Add another flight
              </button>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20 min-w-[200px]">
                <label className="text-xs uppercase tracking-widest text-white/50 block mb-1">Passengers</label>
                <div className="flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-amber-500" />
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
                        passengers: Array(count).fill({ firstName: '', lastName: '', passportNumber: '' })
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
          onClick={nextStep}
          className="w-full mt-8 bg-amber-600 text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-amber-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-amber-600/20"
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
            className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl hover:bg-zinc-900 transition-colors group cursor-pointer"
          >
            <div className="w-12 h-12 bg-amber-600/20 rounded-2xl flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <h3 className="text-xl font-serif text-white mb-3">{item.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderFlights = () => (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button onClick={prevStep} className="text-white/50 hover:text-white flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" /> Back to search
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-serif text-white">{booking.from} to {booking.to}</h2>
            <p className="text-white/50 text-sm">{booking.date} • {booking.passengersCount} Passenger(s)</p>
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
                nextStep();
              }}
              className="bg-zinc-900 border border-white/5 p-6 rounded-3xl hover:border-amber-500/50 transition-all cursor-pointer group"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-12 flex-1">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{flight.departure}</p>
                    <p className="text-white/40 text-sm">{flight.from}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <p className="text-white/30 text-xs uppercase tracking-widest">{flight.duration}</p>
                    <div className="w-full h-px bg-white/10 relative">
                      <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-500 w-4 h-4 rotate-90" />
                    </div>
                    <p className="text-white/30 text-xs">Direct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{flight.arrival}</p>
                    <p className="text-white/40 text-sm">{flight.to}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8 pl-8 border-l border-white/5">
                  <div className="text-right">
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{flight.class}</p>
                    <p className="text-3xl font-bold text-amber-500">${flight.price}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
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
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={prevStep} className="text-white/50 hover:text-white flex items-center gap-2 mb-8">
          <ChevronLeft className="w-5 h-5" /> Back to flights
        </button>
        <h2 className="text-4xl font-serif text-white mb-8">Passenger Details</h2>
        
        <div className="space-y-8">
          {booking.passengers.map((p, i) => (
            <div key={i} className="bg-zinc-900 border border-white/5 p-8 rounded-3xl space-y-6">
              <h3 className="text-amber-500 font-medium flex items-center gap-2">
                <User className="w-5 h-5" /> Passenger {i + 1}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/40 block mb-2">First Name</label>
                  <input 
                    type="text"
                    placeholder="As in passport"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-0 transition-colors"
                    value={p.firstName}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, firstName: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/40 block mb-2">Last Name</label>
                  <input 
                    type="text"
                    placeholder="As in passport"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-0 transition-colors"
                    value={p.lastName}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, lastName: e.target.value };
                      setBooking({ ...booking, passengers: newPassengers });
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-widest text-white/40 block mb-2">Passport Number</label>
                  <input 
                    type="text"
                    placeholder="Enter passport number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-0 transition-colors"
                    value={p.passportNumber}
                    onChange={e => {
                      const newPassengers = [...booking.passengers];
                      newPassengers[i] = { ...p, passportNumber: e.target.value };
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
          className="w-full mt-12 bg-amber-600 text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
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
      <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={prevStep} className="text-white/50 hover:text-white flex items-center gap-2 mb-8">
            <ChevronLeft className="w-5 h-5" /> Back to passengers
          </button>
          <div className="flex flex-col md:flex-row items-start justify-between gap-12">
            <div className="flex-1">
              <h2 className="text-4xl font-serif text-white mb-4">Select Your Seat</h2>
              <p className="text-white/50 mb-8">Choose your preferred seat for a comfortable journey.</p>
              
              <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl overflow-x-auto">
                <div className="min-w-[400px] flex flex-col items-center gap-4">
                  <div className="w-full h-12 bg-white/5 rounded-t-[100px] border-x border-t border-white/10 flex items-center justify-center text-white/20 text-xs uppercase tracking-widest">Cockpit</div>
                  
                  {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex items-center gap-4">
                      <div className="w-6 text-white/20 text-xs font-mono">{r + 1}</div>
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
                                  isOccupied ? "bg-zinc-800 text-zinc-700 cursor-not-allowed" : 
                                  isSelected ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : 
                                  "bg-white/5 text-white/40 hover:bg-white/10"
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
              <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                <h3 className="text-white font-medium mb-4">Selection Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Passengers</span>
                    <span className="text-white">{booking.passengersCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Seats Selected</span>
                    <span className="text-white">{booking.selectedSeats.join(', ') || 'None'}</span>
                  </div>
                </div>
              </div>
              
              <button 
                disabled={booking.selectedSeats.length < booking.passengersCount}
                onClick={nextStep}
                className="w-full bg-amber-600 text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <button onClick={prevStep} className="text-white/50 hover:text-white flex items-center gap-2 mb-8">
          <ChevronLeft className="w-5 h-5" /> Back to seats
        </button>
        <h2 className="text-4xl font-serif text-white mb-4">Enhance Your Journey</h2>
        <p className="text-white/50 mb-12">Add premium services for a truly exceptional experience.</p>
        
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
                "p-8 rounded-3xl border transition-all cursor-pointer flex items-start gap-6",
                booking.addons[item.id as keyof typeof booking.addons] 
                  ? "bg-amber-600/10 border-amber-500" 
                  : "bg-zinc-900 border-white/5 hover:border-white/20"
              )}
            >
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                booking.addons[item.id as keyof typeof booking.addons] ? "bg-amber-600 text-white" : "bg-white/5 text-amber-500"
              )}>
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-medium text-white">{item.title}</h3>
                  <span className="text-amber-500 font-bold">${item.price}</span>
                </div>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={nextStep}
          className="w-full mt-12 bg-amber-600 text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
        >
          Proceed to Payment
        </button>
      </div>
    </div>
  );

  const renderPayment = () => {
    const flightPrice = (booking.selectedFlight?.price || 0) * booking.passengersCount;
    const addonsPrice = (booking.addons.baggage ? 45 : 0) + (booking.addons.lounge ? 60 : 0) + (booking.addons.alMaha ? 35 : 0) + (booking.addons.insurance ? 25 : 0);
    const total = flightPrice + addonsPrice;

    return (
      <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={prevStep} className="text-white/50 hover:text-white flex items-center gap-2 mb-8">
            <ChevronLeft className="w-5 h-5" /> Back to add-ons
          </button>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-8">
              <h2 className="text-4xl font-serif text-white mb-8">Payment</h2>
              
              <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center text-[10px] text-white/40 font-bold">VISA</div>
                  <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center text-[10px] text-white/40 font-bold">MASTER</div>
                  <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center text-[10px] text-white/40 font-bold">AMEX</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-white/40 block mb-2">Card Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
                      <input 
                        type="text"
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:border-amber-500 focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40 block mb-2">Expiry Date</label>
                      <input 
                        type="text"
                        placeholder="MM/YY"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-amber-500 focus:ring-0 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/40 block mb-2">CVV</label>
                      <input 
                        type="text"
                        placeholder="123"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-amber-500 focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-white/40 text-sm">
                <Info className="w-5 h-5 shrink-0" />
                <p>Your payment is secured with 256-bit SSL encryption. By clicking 'Pay Now', you agree to our Terms of Carriage and Privacy Policy.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl">
                <h3 className="text-white font-medium mb-6">Price Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Flight ({booking.passengersCount}x)</span>
                    <span className="text-white">${flightPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Add-ons</span>
                    <span className="text-white">${addonsPrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/40">Taxes & Fees</span>
                    <span className="text-white">$85</span>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-white font-bold">Total</span>
                    <span className="text-2xl font-bold text-amber-500">${total + 85}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={nextStep}
                className="w-full bg-amber-600 text-white py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => (
    <div className="min-h-screen bg-zinc-950 pt-32 pb-20 px-4 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-xl w-full bg-zinc-900 border border-white/5 p-12 rounded-[40px] text-center"
      >
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center text-green-500 mx-auto mb-8">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-4xl font-serif text-white mb-4">Booking Confirmed!</h2>
        <p className="text-white/50 mb-8">Your journey with Gharat Airways is ready. A confirmation email has been sent to your inbox.</p>
        
        <div className="bg-black/30 p-6 rounded-3xl mb-8 text-left space-y-4">
          <div className="flex justify-between">
            <span className="text-white/30 text-xs uppercase tracking-widest">Booking Reference</span>
            <span className="text-amber-500 font-mono font-bold">GA-77X92B</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30 text-xs uppercase tracking-widest">Flight</span>
            <span className="text-white">{booking.selectedFlight?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30 text-xs uppercase tracking-widest">Route</span>
            <span className="text-white">{booking.from} → {booking.to}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30 text-xs uppercase tracking-widest">Seats</span>
            <span className="text-white">{booking.selectedSeats.join(', ')}</span>
          </div>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-white text-black py-5 rounded-2xl text-lg font-bold uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all"
        >
          Return Home
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500/30">
      <Header />
      
      <AnimatePresence mode="wait">
        <motion.main
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
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

      <footer className="bg-black border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                <Plane className="text-white w-4 h-4 rotate-45" />
              </div>
              <span className="text-xl font-serif italic tracking-wider text-white">Gharat Airways</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed">Experience the world like never before with our award-winning service and luxury fleet.</p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-xs">Gharat Airways</h4>
            <ul className="space-y-4 text-sm text-white/40">
              <li><a href="#" className="hover:text-amber-500 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Press Releases</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Sponsorships</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-xs">Group Companies</h4>
            <ul className="space-y-4 text-sm text-white/40">
              <li><a href="#" className="hover:text-amber-500 transition-colors">Hamad International Airport</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Gharat Duty Free</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Gharat Executive</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Gharat Cargo</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-6 uppercase tracking-widest text-xs">Business Solutions</h4>
            <ul className="space-y-4 text-sm text-white/40">
              <li><a href="#" className="hover:text-amber-500 transition-colors">Corporate Travel</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Beyond Business</a></li>
              <li><a href="#" className="hover:text-amber-500 transition-colors">Meetings and Events</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/20 text-xs">© 2026 Gharat Airways. All rights reserved.</p>
          <div className="flex gap-6 text-white/20 text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
            <a href="#" className="hover:text-white transition-colors">Legal</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
