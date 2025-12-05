// Payment validation functions
export const validateCardNumber = (number, type) => {
    const cleaned = number.replace(/\s/g, '');
    if (type === 'mastercard') {
        return /^5[1-5][0-9]{14}$/.test(cleaned) || cleaned === '5555555555554444';
    } else if (type === 'laposte') {
        return /^9[0-9]{15}$/.test(cleaned) || cleaned === '9000111122223333';
    }
    return false;
};

export const validateCVV = (cvv) => {
    return /^[0-9]{3,4}$/.test(cvv);
};

export const validatePhone = (phone) => {
    return /^[0-9]{8}$/.test(phone) || phone === '22334455';
};

export const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


// Simulate calling the REST Payment Gateway
export const processPaymentViaREST = async (rideDetails, paymentMethod, paymentForm) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const cardLast4 = paymentMethod === 'd17' 
        ? paymentForm.phoneNumber.slice(-4) 
        : paymentForm.cardNumber.slice(-4);

    const paymentResponse = {
        transactionId: `TXN-${Date.now()}`,
        amount: rideDetails.fare.total,
        currency: 'TND',
        paymentMethod: paymentMethod === 'mastercard' ? 'Mastercard' : 
                       paymentMethod === 'laposte' ? 'La Poste Card' : 'D17 Mobile Payment',
        cardLast4: cardLast4,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        rideId: rideDetails.rideId,
        protocol: 'REST/HTTP',
        endpoint: 'POST /api/v1/payments',
        httpStatus: 200,
        responseTime: '1.2s',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGc...'
        }
    };
    
    return paymentResponse;
};