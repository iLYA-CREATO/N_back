// База данных в памяти (заменить на PostgreSQL в продакшене)
let users = [
    {
        id: 1,
        username: 'admin',
        password: 'admin123', // "admin123"
        email: 'admin@crm.com'
    }
];

let clients = [
    {
        id: 1,
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+380501234567',
        company: 'Acme Corp',
        status: 'Active',
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        name: 'Tech Solutions Ltd',
        email: 'info@techsolutions.com',
        phone: '+380507654321',
        company: 'Tech Solutions',
        status: 'Pending',
        createdAt: new Date().toISOString()
    }
];

let bids = [
    {
        id: 1,
        clientId: 1,
        clientName: 'Acme Corporation',
        title: 'Website Redesign',
        amount: 50000,
        status: 'Pending',
        description: 'Complete website redesign project',
        createdAt: new Date().toISOString()
    },
    {
        id: 2,
        clientId: 2,
        clientName: 'Tech Solutions Ltd',
        title: 'Mobile App Development',
        amount: 120000,
        status: 'Accepted',
        description: 'Cross-platform mobile application',
        createdAt: new Date().toISOString()
    }
];

let nextClientId = 3;
let nextBidId = 3;

module.exports = {
    users,
    clients,
    bids,
    getNextClientId: () => nextClientId++,
    getNextBidId: () => nextBidId++
};