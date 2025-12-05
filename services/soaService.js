import driversXML from '../data/drivers.xml'; // Assuming a webpack/CRA setup allows importing files
import { getLocationViaCORBA } from './corbaService';

const parseDriversXML = (xmlString, clientLocation, calculateDistance) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const driverNodes = xmlDoc.getElementsByTagName("driver");
    
    const driversArray = [];
    for (let i = 0; i < driverNodes.length; i++) {
        const driver = driverNodes[i];
        const available = driver.getElementsByTagName("available")[0].textContent === "true";
        
        if (available) {
            const lat = parseFloat(driver.getElementsByTagName("latitude")[0].textContent);
            const lng = parseFloat(driver.getElementsByTagName("longitude")[0].textContent);
            
            // Calculate distance using the function provided by the CORBA logic
            const distance = clientLocation 
                ? calculateDistance(clientLocation.latitude, clientLocation.longitude, lat, lng) 
                : 0;
            
            driversArray.push({
                id: driver.getAttribute("id"),
                name: driver.getElementsByTagName("name")[0].textContent,
                phone: driver.getElementsByTagName("phone")[0].textContent,
                rating: parseFloat(driver.getElementsByTagName("rating")[0].textContent),
                vehicle: {
                    make: driver.getElementsByTagName("make")[0].textContent,
                    model: driver.getElementsByTagName("model")[0].textContent,
                    year: driver.getElementsByTagName("year")[0].textContent,
                    color: driver.getElementsByTagName("color")[0].textContent,
                    licensePlate: driver.getElementsByTagName("licensePlate")[0].textContent
                },
                license: driver.getElementsByTagName("license")[0].textContent,
                location: { lat, lng },
                distance: distance.toFixed(1),
                eta: Math.floor(distance * 2) + 2, // Simple ETA calculation
                priceMultiplier: 1.0
            });
        }
    }
    
    return driversArray.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
};

// Simulate calling the SOAP/SOA Map Service
export const findDriversViaSOA = async (clientLocation) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Get the distance calculation function from corbaService
    const { calculateDistance } = await getLocationViaCORBA();

    const parsedDrivers = parseDriversXML(driversXML, clientLocation, calculateDistance);
    
    const soapResponse = {
        drivers: parsedDrivers,
        protocol: 'SOAP over HTTP',
        wsdl: 'http://rideshare.api/MapService?wsdl',
        operation: 'findNearbyDrivers',
        namespace: 'http://rideshare.com/map',
        searchRadius: '5 km',
        totalFound: parsedDrivers.length,
        dataSource: 'drivers.xml',
        xmlParsed: true
    };
    
    return soapResponse;
};