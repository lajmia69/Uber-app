import React, { useState } from 'react';
import { MapPin, Car, DollarSign, Navigation, CreditCard, Map, Users, CheckCircle, Clock, LogIn, UserPlus, Phone, AlertCircle } from 'lucide-react';

// --- Import all service functions ---

// XML Authentication Service (New centralized login/signup)
import { findAccountInXML, checkEmailExists, addNewAccountToXML } from '../services/authService';

// Distributed Architecture Services
import { getLocationViaCORBA } from '../services/corbaService';
import { findDriversViaSOA } from '../services/soaService';
import { bookRideViaRMI } from '../services/rmiService';
import { 
  validateCardNumber, 
  validateCVV, 
  validatePhone, 
  generateVerificationCode, 
  processPaymentViaREST 
} from '../services/restService';


// --- Authentication Logic (Now uses XML Service) ---

const handleSignup = (authForm, userType, setAuthError, setCurrentUser, setIsAuthenticated) => {
  setAuthError('');
  if (!authForm.email || !authForm.password || !authForm.fullName || !authForm.phone) {
    setAuthError('Please fill all required fields');
    return;
  }
  // Check driver specific fields
  if (userType === 'driver' && (!authForm.licenseNumber || !authForm.vehicleMake || !authForm.vehicleModel || !authForm.licensePlate)) {
    setAuthError('Please fill all driver information');
    return;
  }
  
  // 1. XML Check for existing email
  if (checkEmailExists(authForm.email)) {
    setAuthError('Email already exists in the user_accounts.xml file.');
    return;
  }

  try {
    // 2. XML Write operation (simulated)
    const newAccount = addNewAccountToXML(authForm, userType); 
    
    setCurrentUser(newAccount);
    setIsAuthenticated(true);
    setAuthForm({}); // Clear the form
    setAuthError('');
  } catch (error) {
    console.error("XML Write Error:", error);
    setAuthError("Failed to add account to XML. Check server logs (or console in this demo).");
  }
};

const handleLogin = (authForm, userType, setAuthError, setCurrentUser, setIsAuthenticated) => {
  setAuthError('');
  if (!authForm.email || !authForm.password) {
    setAuthError('Please enter email and password');
    return;
  }
  
  // 1. XML Read operation
  const account = findAccountInXML(authForm.email, authForm.password, userType);
  
  // 2. Check result
  if (account) {
    setCurrentUser(account);
    setIsAuthenticated(true);
    setAuthForm({}); // Clear the form
    setAuthError('');
  } else {
    setAuthError(`Invalid ${userType} email or password, or account does not exist in user_accounts.xml.`);
  }
};
// -------------------------------------------------------------------------


const UberSynergyApp = () => {
  // --- Global State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);
  const [showAuthForm, setShowAuthForm] = useState('choice');
  const [currentUser, setCurrentUser] = useState(null);
  
  // --- Ride Flow State ---
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState(null);
  const [drivers, setDrivers] = useState(null); 
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [rideDetails, setRideDetails] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // --- Form and Error State ---
  const [authForm, setAuthForm] = useState({ 
    email: '', 
    password: '', 
    fullName: '', 
    phone: '',
    licenseNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    licensePlate: '',
    vehicleColor: '' 
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentForm, setPaymentForm] = useState({ 
    cardNumber: '', 
    cvv: '', 
    phoneNumber: '', 
    verificationCode: '' 
  });
  const [showVerification, setShowVerification] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [paymentError, setPaymentError] = useState('');


  // --- Service Callbacks ---

  const handleGetLocation = async () => {
    setLoading(true);
    try {
      // 1. CORBA Service Call
      const { locationData } = await getLocationViaCORBA(pickup);
      setLocation(locationData);
      setCurrentStep(2);
    } catch (error) {
      console.error("CORBA Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFindDrivers = async () => {
    setLoading(true);
    try {
      // 2. SOA Service Call
      const driversResponse = await findDriversViaSOA(location);
      setDrivers(driversResponse);
      setCurrentStep(3);
    } catch (error) {
      console.error("SOA Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async (driver) => {
    setLoading(true);
    setSelectedDriver(driver);
    try {
      // 3. RMI Service Call
      const bookingResponse = await bookRideViaRMI(driver, currentUser, pickup, destination, location);
      setRideDetails(bookingResponse);
      setCurrentStep(4);
    } catch (error) {
      console.error("RMI Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = () => {
    setPaymentError('');

    if (paymentMethod === 'mastercard' || paymentMethod === 'laposte') {
      // Use imported validation functions from restService.js
      if (!validateCardNumber(paymentForm.cardNumber, paymentMethod)) {
        setPaymentError(`Invalid ${paymentMethod === 'mastercard' ? 'Mastercard' : 'La Poste'} card number`);
        return;
      }
      if (!validateCVV(paymentForm.cvv)) {
        setPaymentError('Invalid CVV code');
        return;
      }
      handleProcessPayment();
    } else if (paymentMethod === 'd17') {
      // Use imported validation function from restService.js
      if (!validatePhone(paymentForm.phoneNumber)) {
        setPaymentError('Invalid phone number (8 digits required)');
        return;
      }
      const code = generateVerificationCode();
      setGeneratedCode(code);
      setShowVerification(true);
      alert(`Verification code sent to ${paymentForm.phoneNumber}: ${code}`);
    }
  };

  const verifyD17Payment = () => {
    if (paymentForm.verificationCode === generatedCode) {
      handleProcessPayment();
    } else {
      setPaymentError('Invalid verification code');
    }
  };

  const handleProcessPayment = async () => {
    setLoading(true);
    try {
      // 4. REST Service Call
      const paymentResponse = await processPaymentViaREST(rideDetails, paymentMethod, paymentForm);
      setPaymentStatus(paymentResponse);
      setCurrentStep(5);
      setShowVerification(false);
    } catch (error) {
      console.error("REST Error:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // --- UI Control Functions ---

  const resetFlow = () => {
    setCurrentStep(1);
    setLocation(null);
    setDrivers(null);
    setSelectedDriver(null);
    setPickup('');
    setDestination('');
    setRideDetails(null);
    setPaymentStatus(null);
    setLoading(false);
    setPaymentMethod('');
    setPaymentForm({ cardNumber: '', cvv: '', phoneNumber: '', verificationCode: '' });
    setPaymentError('');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUserType(null);
    setShowAuthForm('choice');
    setAuthForm({});
    setAuthError('');
    resetFlow();
  };

  // --- Render methods ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              RideShare System
            </h1>
            <p className="text-gray-300">Distributed Architecture Platform</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 shadow-2xl">
            {showAuthForm === 'choice' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Choose Account Type</h2>
                <button
                  onClick={() => { setUserType('rider'); setShowAuthForm('login'); setAuthError(''); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Users className="w-5 h-5" /> Continue as Rider
                </button>
                <button
                  onClick={() => { setUserType('driver'); setShowAuthForm('login'); setAuthError(''); }}
                  className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Car className="w-5 h-5" /> Continue as Driver
                </button>
              </div>
            )}
            {(showAuthForm === 'login' || showAuthForm === 'signup') && (
              <div>
                <button
                  onClick={() => { setShowAuthForm('choice'); setUserType(null); setAuthError(''); }}
                  className="text-gray-400 hover:text-white mb-4"
                >
                  ← Back
                </button>
                <h2 className="text-2xl font-bold mb-2">
                  {showAuthForm === 'login' ? 'Log In' : 'Sign Up'} as {userType === 'rider' ? 'Rider' : 'Driver'}
                </h2>
                {authError && (
                  <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-sm text-red-300">{authError}</span>
                  </div>
                )}
                <div className="space-y-4">
                  <input type="email" placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="password" placeholder="Password" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  {showAuthForm === 'signup' && (
                    <>
                      <input type="text" placeholder="Full Name" value={authForm.fullName} onChange={(e) => setAuthForm({...authForm, fullName: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="tel" placeholder="Phone Number" value={authForm.phone} onChange={(e) => setAuthForm({...authForm, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                      {userType === 'driver' && (
                          <>
                            <div className="border-t border-gray-600 pt-4 mt-4"><h3 className="font-semibold mb-3 text-green-400">Driver Information</h3></div>
                            <input type="text" placeholder="Driver License Number" value={authForm.licenseNumber} onChange={(e) => setAuthForm({...authForm, licenseNumber: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                            <div className="grid grid-cols-2 gap-3">
                              <input type="text" placeholder="Vehicle Make" value={authForm.vehicleMake} onChange={(e) => setAuthForm({...authForm, vehicleMake: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                              <input type="text" placeholder="Vehicle Model" value={authForm.vehicleModel} onChange={(e) => setAuthForm({...authForm, vehicleModel: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <input type="text" placeholder="License Plate" value={authForm.licensePlate} onChange={(e) => setAuthForm({...authForm, licensePlate: e.target.value})} className="w-full px-4 py-3 bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500" />
                          </>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => showAuthForm === 'login' 
                      ? handleLogin(authForm, userType, setAuthError, setCurrentUser, setIsAuthenticated) 
                      : handleSignup(authForm, userType, setAuthError, setCurrentUser, setIsAuthenticated)
                    }
                    className={`w-full ${userType === 'rider' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} py-3 rounded-lg font-semibold transition-all`}
                  >
                    {showAuthForm === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthForm(showAuthForm === 'login' ? 'signup' : 'login');
                      setAuthError('');
                    }}
                    className="w-full text-gray-400 hover:text-white text-sm"
                  >
                    {showAuthForm === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Application UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Distributed Ride-Sharing System
            </h1>
            <p className="text-gray-300">Four Protocols Working in Perfect Synergy</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Welcome, {currentUser.fullName}</p>
            <p className="text-xs text-gray-500">{currentUser.userType === 'rider' ? 'Rider' : 'Driver'} Account</p>
            <button onClick={logout} className="text-sm text-blue-400 hover:text-blue-300 mt-1">
              Logout
            </button>
          </div>
        </div>

        {/* --- Progress Bar UI --- */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur rounded-xl p-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, icon: Navigation, label: 'Location', tech: 'CORBA' },
              { num: 2, icon: Map, label: 'Find Drivers', tech: 'SOA/SOAP' },
              { num: 3, icon: Car, label: 'Book Ride', tech: 'RMI' },
              { num: 4, icon: CreditCard, label: 'Payment', tech: 'REST' }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <div className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                    currentStep > step.num ? 'bg-green-600' :
                    currentStep === step.num ? 'bg-blue-600 ring-4 ring-blue-400/50 animate-pulse' :
                    'bg-gray-600'
                  }`}>
                    {currentStep > step.num ? (
                      <CheckCircle className="w-8 h-8" />
                    ) : (
                      <step.icon className="w-8 h-8" />
                    )}
                  </div>
                  <span className="font-semibold text-sm">{step.label}</span>
                  <span className="text-xs text-blue-400">{step.tech}</span>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-1 mx-4 rounded transition-all ${
                    currentStep > step.num ? 'bg-green-600' : 'bg-gray-600'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/80 backdrop-blur rounded-xl p-6 shadow-2xl">
            {/* --- STEP 1: Get Location (CORBA) --- */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Navigation className="text-blue-400" />
                  Get Your Location (CORBA)
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Pickup Address</label>
                    <input type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Enter your current location" className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Destination</label>
                    <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Where to?" className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-400 mb-2">CORBA Location Service</h3>
                    <p className="text-sm text-gray-300">Using CORBA IIOP protocol to communicate with distributed location servers and retrieve precise GPS coordinates.</p>
                  </div>
                  <button
                    onClick={handleGetLocation} 
                    disabled={loading || !pickup || !destination}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 py-4 rounded-lg font-bold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Locating via CORBA...' : 'Get Location'}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 2: Find Drivers (SOA/SOAP) --- */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Map className="text-purple-400" />
                  Find Nearby Drivers (SOA/SOAP)
                </h2>
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                    <p className="text-sm text-gray-300">Location acquired: {location.address}</p>
                    <p className="text-xs text-gray-400 mt-1">Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}</p>
                  </div>
                  <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-400 mb-2">SOA Map Service</h3>
                    <p className="text-sm text-gray-300">Using SOAP web service to query operational\_drivers.xml file and find available drivers within 5km radius.</p>
                  </div>
                  <button
                    onClick={handleFindDrivers} 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 py-4 rounded-lg font-bold transition-all disabled:opacity-50"
                  >
                    {loading ? 'Loading from XML via SOAP...' : 'Find Available Drivers'}
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 3: Select Driver (RMI) --- */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Users className="text-green-400" />
                  Select Your Driver
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {drivers && drivers.drivers.map((driver) => (
                    <div
                      key={driver.id}
                      className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 cursor-pointer transition-all"
                      onClick={() => handleBookRide(driver)} 
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{driver.name}</h3>
                          <p className="text-sm text-gray-400">{driver.vehicle.make} {driver.vehicle.model} {driver.vehicle.year}</p>
                          <p className="text-xs text-gray-500">{driver.vehicle.licensePlate} - {driver.vehicle.color}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-semibold">{driver.rating}</div>
                          <div className="text-xs text-gray-400">{driver.distance} km away</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {driver.eta} min
                        </span>
                        <button className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded-lg text-sm font-semibold">
                          Select Driver
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                  <h3 className="font-semibold text-green-400 mb-2">Java RMI Booking Service</h3>
                  <p className="text-sm text-gray-300">Click a driver to book via RMI remote method invocation.</p>
                </div>
              </div>
            )}

            {/* --- STEP 4: Complete Payment (REST) --- */}
            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CreditCard className="text-orange-400" />
                  Complete Payment (REST)
                </h2>
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                    <h3 className="font-bold text-xl mb-2">Fare: {rideDetails.fare.total} {rideDetails.fare.currency}</h3>
                    <p className="text-sm text-gray-300">Driver: {rideDetails.driver.name} ({rideDetails.driver.vehicle.licensePlate})</p>
                    <p className="text-sm text-gray-400">Pickup: {rideDetails.pickup.address}</p>
                    <p className="text-sm text-gray-400">Destination: {destination}</p>
                    <p className="text-xs text-gray-500 mt-2">Booked via RMI ({rideDetails.rideId})</p>
                  </div>

                  <h3 className="font-semibold text-lg">Select Payment Method</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['mastercard', 'laposte', 'd17'].map(method => (
                      <button
                        key={method}
                        onClick={() => {
                          setPaymentMethod(method);
                          setPaymentError('');
                          setPaymentForm({ cardNumber: '', cvv: '', phoneNumber: '', verificationCode: '' });
                          setShowVerification(false);
                        }}
                        className={`p-3 rounded-lg font-medium text-sm transition-colors ${
                          paymentMethod === method ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {method.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {paymentError && (
                    <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-sm text-red-300">{paymentError}</span>
                    </div>
                  )}

                  {paymentMethod && (
                    <div className="p-4 bg-gray-700 rounded-lg space-y-3">
                      <h4 className="font-semibold text-orange-400 mb-2">REST Payment Gateway Details</h4>

                      {paymentMethod !== 'd17' && !showVerification && (
                        <>
                          <input
                            type="text"
                            placeholder="Card Number"
                            value={paymentForm.cardNumber}
                            onChange={(e) => setPaymentForm({...paymentForm, cardNumber: e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()})}
                            className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            maxLength="19"
                          />
                          <input
                            type="text"
                            placeholder="CVV"
                            value={paymentForm.cvv}
                            onChange={(e) => setPaymentForm({...paymentForm, cvv: e.target.value.replace(/[^0-9]/g, '')})}
                            className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            maxLength="4"
                          />
                          <p className="text-xs text-gray-400">Demo cards: 5555555555554444 (Mastercard), 9000111122223333 (La Poste)</p>
                        </>
                      )}

                      {paymentMethod === 'd17' && !showVerification && (
                        <>
                          <input
                            type="tel"
                            placeholder="D17 Phone Number (8 digits)"
                            value={paymentForm.phoneNumber}
                            onChange={(e) => setPaymentForm({...paymentForm, phoneNumber: e.target.value.replace(/[^0-9]/g, '')})}
                            className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            maxLength="8"
                          />
                          <p className="text-xs text-gray-400">Demo phone: 22334455</p>
                        </>
                      )}

                      {showVerification && paymentMethod === 'd17' && (
                        <>
                          <input
                            type="text"
                            placeholder="Verification Code (6 digits)"
                            value={paymentForm.verificationCode}
                            onChange={(e) => setPaymentForm({...paymentForm, verificationCode: e.target.value.replace(/[^0-9]/g, '')})}
                            className="w-full px-4 py-3 bg-gray-800 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            maxLength="6"
                          />
                          <button
                            onClick={verifyD17Payment}
                            disabled={loading || paymentForm.verificationCode.length !== 6}
                            className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                          >
                            {loading ? 'Processing via REST...' : 'Verify & Pay (REST Call)'}
                          </button>
                        </>
                      )}

                      {!showVerification && (
                        <button
                          onClick={initiatePayment}
                          disabled={loading || !paymentMethod || (paymentMethod !== 'd17' && (!paymentForm.cardNumber || !paymentForm.cvv)) || (paymentMethod === 'd17' && !paymentForm.phoneNumber)}
                          className="w-full bg-orange-600 hover:bg-orange-700 py-3 rounded-lg font-bold transition-all disabled:opacity-50"
                        >
                          {paymentMethod === 'd17' ? 'Send Verification Code' : 'Pay Now (Initiate REST Call)'}
                        </button>
                      )}

                      <p className="text-xs text-gray-500 pt-2">The payment is processed through a RESTful API endpoint: <code className="text-orange-300">POST /api/v1/payments</code></p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- STEP 5: Confirmation --- */}
            {currentStep === 5 && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="text-yellow-400" />
                  Ride Confirmed & Paid
                </h2>
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
                    <h3 className="font-bold text-xl text-green-400">Transaction Successful!</h3>
                    <p className="text-sm mt-1">Total Paid: **{paymentStatus.amount} {paymentStatus.currency}**</p>
                    <p className="text-xs mt-2">Transaction ID: {paymentStatus.transactionId}</p>
                    <p className="text-xs">Paid with: {paymentStatus.paymentMethod} (Last 4: {paymentStatus.cardLast4})</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Protocol Trace</h3>
                    <p className="text-xs text-blue-400">1. Location: **{location.protocol}**</p>
                    <p className="text-xs text-purple-400">2. Driver Search: **{drivers.protocol}**</p>
                    <p className="text-xs text-green-400">3. Ride Booking: **{rideDetails.protocol}**</p>
                    <p className="text-xs text-orange-400">4. Payment: **{paymentStatus.protocol}**</p>
                  </div>
                  <button
                    onClick={resetFlow}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 py-3 rounded-lg font-bold transition-all"
                  >
                    Book Another Ride
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* --- Right Panel (Protocol Monitor) --- */}
          <div className="bg-gray-800/80 backdrop-blur rounded-xl p-6 shadow-2xl space-y-4">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Phone className="text-pink-400" />
              Distributed Service Monitor
            </h2>
            <div className="text-sm space-y-3">
              {location && (
                <div className="bg-blue-900/50 p-3 rounded-lg border-l-4 border-blue-400">
                  <p className="font-semibold text-blue-300">1. CORBA Location Response</p>
                  <p className="text-xs text-gray-300">Service: **{location.service}**</p>
                  <p className="text-xs text-gray-300">Method: **{location.method}**</p>
                  <p className="text-xs text-gray-300">Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>
                  <p className="text-xs text-gray-400">Protocol: {location.protocol} ({location.orb})</p>
                </div>
              )}
              {drivers && (
                <div className="bg-purple-900/50 p-3 rounded-lg border-l-4 border-purple-400">
                  <p className="font-semibold text-purple-300">2. SOA Driver Search Response</p>
                  <p className="text-xs text-gray-300">Operation: **{drivers.operation}**</p>
                  <p className="text-xs text-gray-300">Drivers Found: **{drivers.totalFound}**</p>
                  <p className="text-xs text-gray-300">Source: {drivers.dataSource} (XML)</p>
                  <p className="text-xs text-gray-400">Protocol: {drivers.protocol} (WSDL: {drivers.wsdl.split('/').pop().split('?')[0]})</p>
                </div>
              )}
              {rideDetails && (
                <div className="bg-green-900/50 p-3 rounded-lg border-l-4 border-green-400">
                  <p className="font-semibold text-green-300">3. RMI Ride Booking Confirmation</p>
                  <p className="text-xs text-gray-300">Ride ID: **{rideDetails.rideId}**</p>
                  <p className="text-xs text-gray-300">Driver: **{rideDetails.driver.name}**</p>
                  <p className="text-xs text-gray-300">Fare Total: **{rideDetails.fare.total} {rideDetails.fare.currency}**</p>
                  <p className="text-xs text-gray-400">Protocol: {rideDetails.protocol} (Registry: {rideDetails.registry.split('/').pop()})</p>
                </div>
              )}
              {paymentStatus && (
                <div className="bg-orange-900/50 p-3 rounded-lg border-l-4 border-orange-400">
                  <p className="font-semibold text-orange-300">4. REST Payment Confirmation</p>
                  <p className="text-xs text-gray-300">Transaction ID: **{paymentStatus.transactionId}**</p>
                  <p className="text-xs text-gray-300">Status: **{paymentStatus.status}**</p>
                  <p className="text-xs text-gray-300">Method: {paymentStatus.paymentMethod}</p>
                  <p className="text-xs text-gray-400">Protocol: {paymentStatus.protocol} (HTTP Status: {paymentStatus.httpStatus})</p>
                </div>
              )}
              {(!location && !loading && currentStep === 1) && (
                <div className="bg-gray-700/50 p-4 rounded-lg text-center text-gray-400">
                  Start the ride flow to see the distributed service calls in action.
                </div>
              )}
              {loading && (
                <div className="bg-gray-700/50 p-4 rounded-lg text-center text-gray-300 flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Awaiting Response from Service...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UberSynergyApp;