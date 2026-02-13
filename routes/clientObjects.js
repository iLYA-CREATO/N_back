const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Получение всех объектов клиентов
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { clientId } = req.query;
        const whereClause = {};
        if (clientId) {
            whereClause.clientId = parseInt(clientId);
        }
        const clientObjects = await prisma.clientObject.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                equipment: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                bids: {
                    select: {
                        id: true,
                        tema: true,
                        status: true,
                    },
                },
            },
        });
        res.json(clientObjects);
    } catch (error) {
        console.error('Get client objects error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получение одного объекта клиента
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const clientObject = await prisma.clientObject.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                equipment: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                bids: {
                    select: {
                        id: true,
                        tema: true,
                        status: true,
                        description: true,
                    },
                },
            },
        });

        if (!clientObject) {
            return res.status(404).json({ message: 'Client object not found' });
        }

        res.json(clientObject);
    } catch (error) {
        console.error('Get client object error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Создание объекта клиента
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { clientId, brandModel, stateNumber, equipmentId } = req.body;

        // If equipmentId provided, check it belongs to the client
        if (equipmentId) {
            const equipment = await prisma.equipment.findUnique({
                where: { id: parseInt(equipmentId) }
            });
            if (!equipment) {
                return res.status(404).json({ message: 'Equipment not found' });
            }
            if (equipment.clientId !== parseInt(clientId)) {
                return res.status(400).json({ message: 'Equipment does not belong to the client' });
            }
        }

        const newClientObject = await prisma.clientObject.create({
            data: {
                clientId: parseInt(clientId),
                brandModel,
                stateNumber,
                equipmentId: equipmentId ? parseInt(equipmentId) : null,
            },
            include: {
                equipment: true
            }
        });

        res.status(201).json(newClientObject);
    } catch (error) {
        console.error('Create client object error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Обновление объекта клиента
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { brandModel, stateNumber, equipmentId } = req.body;

        // Get current clientObject to check client
        const currentObject = await prisma.clientObject.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!currentObject) {
            return res.status(404).json({ message: 'Client object not found' });
        }

        // If equipmentId provided, check it belongs to the client
        if (equipmentId) {
            const equipment = await prisma.equipment.findUnique({
                where: { id: parseInt(equipmentId) }
            });
            if (!equipment) {
                return res.status(404).json({ message: 'Equipment not found' });
            }
            if (equipment.clientId !== currentObject.clientId) {
                return res.status(400).json({ message: 'Equipment does not belong to the client' });
            }
        }

        const updatedClientObject = await prisma.clientObject.update({
            where: { id: parseInt(req.params.id) },
            data: {
                brandModel,
                stateNumber,
                equipmentId: equipmentId ? parseInt(equipmentId) : null,
            },
            include: {
                equipment: true
            }
        });

        res.json(updatedClientObject);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Client object not found' });
        }
        console.error('Update client object error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удаление объекта клиента
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedClientObject = await prisma.clientObject.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({ message: 'Client object deleted', clientObject: deletedClientObject });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Client object not found' });
        }
        console.error('Delete client object error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk upload client objects
router.post('/bulk-upload', authMiddleware, async (req, res) => {
    try {
        const { clientObjects } = req.body;

        if (!Array.isArray(clientObjects) || clientObjects.length === 0) {
            return res.status(400).json({ message: 'Client objects array is required' });
        }

        const createdClientObjects = [];
        const errors = [];

        for (let i = 0; i < clientObjects.length; i++) {
            const clientObjectData = clientObjects[i];
            try {
                // Validate required fields
                if (!clientObjectData.clientId && !clientObjectData.brandModel) {
                    errors.push({ row: i + 1, error: 'Client ID and Brand/Model are required' });
                    continue;
                }

                // If clientId is a string (client name), find the client by name
                let clientId = clientObjectData.clientId;
                if (typeof clientId === 'string' && isNaN(parseInt(clientId))) {
                    const client = await prisma.client.findFirst({
                        where: { name: clientId }
                    });
                    if (!client) {
                        errors.push({ row: i + 1, error: `Client "${clientId}" not found` });
                        continue;
                    }
                    clientId = client.id;
                } else {
                    clientId = parseInt(clientId);
                }

                const newClientObject = await prisma.clientObject.create({
                    data: {
                        clientId: clientId,
                        brandModel: clientObjectData.brandModel,
                        stateNumber: clientObjectData.stateNumber || null,
                        equipment: clientObjectData.equipment || null,
                        createdAt: clientObjectData.createdAt ? new Date(clientObjectData.createdAt) : new Date(),
                    },
                });
                createdClientObjects.push(newClientObject);
            } catch (error) {
                console.error(`Error creating client object at row ${i + 1}:`, error);
                errors.push({ row: i + 1, error: error.message });
            }
        }

        res.status(201).json({
            message: `Successfully created ${createdClientObjects.length} client objects`,
            created: createdClientObjects.length,
            errors: errors.length,
            errorDetails: errors
        });
    } catch (error) {
        console.error('Bulk upload client objects error:', error);
        res.status(500).json({ message: 'Server error during bulk upload' });
    }
});

module.exports = router;