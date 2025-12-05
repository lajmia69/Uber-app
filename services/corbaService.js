// Function to simulate Haversine distance calculation (needed by SOA)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

// Simulate calling the CORBA Location Service
export const getLocationViaCORBA = async (pickupAddress) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate getting location data (randomized coordinates around Tunis, Tunisia)
    const locationData = {
        latitude: 36.8065 + (Math.random() - 0.5) * 0.1,
        longitude: 10.1815 + (Math.random() - 0.5) * 0.1,
        address: pickupAddress || '123 Main Street, Sfax',
        timestamp: new Date().toISOString(),
        accuracy: Math.floor(Math.random() * 20) + 5,
        protocol: 'CORBA/IIOP',
        service: 'ILocationService',
        method: 'getCurrentLocation()',
        orb: 'OMG CORBA 2.3'
    };
    
    return { locationData, calculateDistance }; // Export distance function for use in SOA service
};