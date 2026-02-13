const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Get all client equipment
router.get('/', authMiddleware, async (req, res) => {
    try {
        const clientEquipment = await prisma.clientEquipment.findMany({
            include: {
                client: true,
                equipment: true,
                bid: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(clientEquipment);
    } catch (error) {
        console.error('Get client equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get equipment for a specific client
router.get('/client/:clientId', authMiddleware, async (req, res) => {
    try {
        const clientEquipment = await prisma.clientEquipment.findMany({
            where: { clientId: parseInt(req.params.clientId) },
            include: {
                equipment: true,
                bid: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(clientEquipment);
    } catch (error) {
        console.error('Get client equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create client equipment
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { clientId, equipmentId, imei, bidId } = req.body;

        // Check if this combination already exists
        const existing = await prisma.clientEquipment.findUnique({
            where: {
                clientId_equipmentId: {
                    clientId: parseInt(clientId),
                    equipmentId: parseInt(equipmentId)
                }
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'This equipment is already assigned to this client' });
        }

        const clientEquipment = await prisma.clientEquipment.create({
            data: {
                clientId: parseInt(clientId),
                equipmentId: parseInt(equipmentId),
                imei: imei || null,
                bidId: bidId ? parseInt(bidId) : null
            },
            include: {
                client: true,
                equipment: true,
                bid: true
            }
        });

        res.json(clientEquipment);
    } catch (error) {
        console.error('Create client equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete client equipment
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.clientEquipment.delete({
            where: { id: parseInt(req.params.id) }
        });

        res.json({ message: 'Client equipment deleted successfully' });
    } catch (error) {
        console.error('Delete client equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;