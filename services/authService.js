import accountsXML from '../data/user_accounts.xml';
// In a real application, the write operation would require a server-side API.
// Here, we simulate by modifying the XML string and relying on the browser's
// memory for the session, but in a persistence layer, this would be crucial.

const XML_PARSER = new DOMParser();
const XML_SERIALIZER = new XMLSerializer();

// Utility to find the next available ID
const getNextId = (doc, userType) => {
    const prefix = userType === 'rider' ? 'RDR' : 'DRV';
    const nodes = doc.getElementsByTagName(userType);
    if (nodes.length === 0) return `${prefix}001`;

    const lastNode = nodes[nodes.length - 1];
    const lastId = lastNode.getAttribute('id');
    const lastNum = parseInt(lastId.replace(prefix, '')) || 0;
    const nextNum = lastNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
};

// Function to find an account
export const findAccountInXML = (email, password, userType) => {
    const xmlDoc = XML_PARSER.parseFromString(accountsXML, "text/xml");
    const accountNodes = xmlDoc.getElementsByTagName(userType);

    for (let i = 0; i < accountNodes.length; i++) {
        const node = accountNodes[i];
        const nodeEmail = node.getElementsByTagName('email')[0]?.textContent;
        const nodePassword = node.getElementsByTagName('password')[0]?.textContent;

        if (nodeEmail === email && nodePassword === password) {
            // Found account, package the details
            const account = {
                id: node.getAttribute('id'),
                fullName: node.getElementsByTagName('fullName')[0]?.textContent,
                email: nodeEmail,
                phone: node.getElementsByTagName('phone')[0]?.textContent,
                userType: userType
            };
            
            if (userType === 'driver') {
                account.driverInfo = {
                    licenseNumber: node.getElementsByTagName('licenseNumber')[0]?.textContent,
                    vehicleMake: node.getElementsByTagName('vehicleMake')[0]?.textContent,
                    vehicleModel: node.getElementsByTagName('vehicleModel')[0]?.textContent,
                    licensePlate: node.getElementsByTagName('licensePlate')[0]?.textContent,
                };
            }
            return account;
        }
    }
    return null;
};

// Function to check if an email already exists
export const checkEmailExists = (email) => {
    const xmlDoc = XML_PARSER.parseFromString(accountsXML, "text/xml");
    const allUsers = xmlDoc.getElementsByTagName('users')[0].children; // Includes both rider and driver tags

    for (let i = 0; i < allUsers.length; i++) {
        const node = allUsers[i];
        const nodeEmail = node.getElementsByTagName('email')[0]?.textContent;
        if (nodeEmail === email) {
            return true;
        }
    }
    return false;
};


// Function to simulate adding a new account to the XML file
export const addNewAccountToXML = (authForm, userType) => {
    // 1. Parse the current XML
    let xmlDoc = XML_PARSER.parseFromString(accountsXML, "text/xml");
    const root = xmlDoc.getElementsByTagName('users')[0];
    
    // 2. Create the new user element
    const newUser = xmlDoc.createElement(userType);
    const newId = getNextId(xmlDoc, userType);
    newUser.setAttribute('id', newId);

    // Helper to create and append text nodes
    const appendTextNode = (parent, tagName, text) => {
        const element = xmlDoc.createElement(tagName);
        element.textContent = text;
        parent.appendChild(element);
    };

    // 3. Append core fields
    appendTextNode(newUser, 'fullName', authForm.fullName);
    appendTextNode(newUser, 'email', authForm.email);
    appendTextNode(newUser, 'password', authForm.password);
    appendTextNode(newUser, 'phone', authForm.phone);

    // 4. Append driver-specific fields
    if (userType === 'driver') {
        appendTextNode(newUser, 'licenseNumber', authForm.licenseNumber);
        appendTextNode(newUser, 'vehicleMake', authForm.vehicleMake);
        appendTextNode(newUser, 'vehicleModel', authForm.vehicleModel);
        appendTextNode(newUser, 'licensePlate', authForm.licensePlate);
    }

    // 5. Append new user to the XML root
    root.appendChild(newUser);

    // 6. Serialize the updated XML and store it temporarily in a global/session scope
    // NOTE: In a browser environment, this update won't persist past the session/refresh
    // unless you save it to local storage or call a backend API.
    // For this demonstration, we'll return the updated XML string.
    const updatedXMLString = XML_SERIALIZER.serializeToString(xmlDoc);
    
    // 7. Update the local variable for subsequent calls (Simulation)
    // *** This is the crucial simulation step for persistence in the browser ***
    accountsXML = updatedXMLString; 
    
    const account = {
        id: newId,
        fullName: authForm.fullName,
        email: authForm.email,
        phone: authForm.phone,
        userType: userType
    };
    return account;
};

// Renaming the operational file for clarity
import operationalDriversXML from '../data/operational_drivers.xml';
export { operationalDriversXML };