const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Get all bid equipment for expense history
router.get('/expense-history', authMiddleware, async (req, res) => {
    try {
        const bidEquipments = await prisma.bidEquipment.findMany({
            include: {
                equipment: true,
                bid: {
                    include: {
                        client: true,
                        clientObject: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(bidEquipments);
    } catch (error) {
        console.error('Get expense history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get return history for equipment
router.get('/return-history', authMiddleware, async (req, res) => {
    try {
        const returnHistory = await prisma.auditLog.findMany({
            where: {
                action: 'equipment_removed'
            },
            include: {
                bid: {
                    include: {
                        client: true,
                        clientObject: true,
                        creator: {
                            select: {
                                id: true,
                                fullName: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Parse the details JSON for each entry
        const formattedReturnHistory = returnHistory.map(log => {
            const details = JSON.parse(log.details || '{}');
            return {
                id: log.id,
                bidId: log.bidId,
                bidTema: log.bid?.tema || '-',
                client: log.bid?.client?.name || '-',
                clientObject: log.bid?.clientObject ? 
                    (log.bid.clientObject.brandModel + ' ' + log.bid.clientObject.stateNumber) : '-',
                equipmentName: details.equipmentName || '-',
                imei: details.imei || '-',
                quantity: details.quantity || 1,
                returnReason: details.returnReason || '-',
                returnedBy: log.user?.fullName || '-',
                createdBy: log.bid?.creator?.fullName || '-',
                createdAt: log.createdAt
            };
        });

        res.json(formattedReturnHistory);
    } catch (error) {
        console.error('Get return history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all bid equipment for a bid
router.get('/bid/:bidId', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.bidId);
        const bidEquipments = await prisma.bidEquipment.findMany({
            where: { bidId },
            include: {
                equipment: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(bidEquipments);
    } catch (error) {
        console.error('Get bid equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create bid equipment
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { bidId, equipmentId, imei, quantity } = req.body;

        // Get bid with client
        const bid = await prisma.bid.findUnique({
            where: { id: parseInt(bidId) },
            include: { client: true }
        });
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Check that equipment belongs to the bid's client
        const equipment = await prisma.equipment.findUnique({
            where: { id: parseInt(equipmentId) }
        });
        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Check if equipment is assigned to the client
        const clientEquipment = await prisma.clientEquipment.findUnique({
            where: {
                clientId_equipmentId: {
                    clientId: bid.clientId,
                    equipmentId: parseInt(equipmentId)
                }
            }
        });
        if (!clientEquipment) {
            return res.status(400).json({ message: 'Equipment is not assigned to the bid\'s client' });
        }

        // Check IMEI uniqueness if provided
        if (imei) {
            const existing = await prisma.bidEquipment.findFirst({
                where: { imei }
            });
            if (existing) {
                return res.status(400).json({ message: 'Оборудование с таким imei уже есть' });
            }
        }

        const newBidEquipment = await prisma.bidEquipment.create({
            data: {
                bidId: parseInt(bidId),
                equipmentId: parseInt(equipmentId),
                imei: imei || null,
                quantity: quantity ? parseInt(quantity) : 1,
            },
            include: {
                equipment: true
            }
        });

        // Update ClientEquipment with IMEI and bidId if IMEI is provided
        if (imei) {
            await prisma.clientEquipment.updateMany({
                where: {
                    clientId: bid.clientId,
                    equipmentId: parseInt(equipmentId)
                },
                data: {
                    imei: imei,
                    bidId: parseInt(bidId)
                }
            });
        }

        res.status(201).json(newBidEquipment);
    } catch (error) {
        console.error('Create bid equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update bid equipment
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { imei, quantity } = req.body;
        const id = parseInt(req.params.id);

        // Check IMEI uniqueness if provided and not null
        if (imei !== undefined && imei !== null) {
            const existing = await prisma.bidEquipment.findFirst({
                where: { imei, id: { not: id } }
            });
            if (existing) {
                return res.status(400).json({ message: 'Оборудование с таким imei уже есть' });
            }
        }

        const updatedBidEquipment = await prisma.bidEquipment.update({
            where: { id },
            data: {
                imei: imei !== undefined ? imei : undefined,
                quantity: quantity !== undefined ? parseInt(quantity) : undefined,
            },
            include: {
                equipment: true,
                bid: {
                    include: {
                        client: true
                    }
                }
            }
        });

        // Update ClientEquipment with new IMEI if it changed
        if (imei !== undefined) {
            await prisma.clientEquipment.updateMany({
                where: {
                    clientId: updatedBidEquipment.bid.clientId,
                    equipmentId: updatedBidEquipment.equipmentId
                },
                data: {
                    imei: imei
                }
            });
        }

        res.json(updatedBidEquipment);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Bid equipment not found' });
        }
        console.error('Update bid equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete bid equipment
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { returnReason } = req.body;
        const deletedBidEquipment = await prisma.bidEquipment.delete({
            where: { id: parseInt(req.params.id) },
            include: {
                equipment: true
            }
        });

        // Create audit log for equipment deletion with return reason
        await prisma.auditLog.create({
            data: {
                bidId: deletedBidEquipment.bidId,
                userId: req.user.id,
                action: 'equipment_removed',
                details: JSON.stringify({
                    equipmentId: deletedBidEquipment.equipmentId,
                    equipmentName: deletedBidEquipment.equipment.name,
                    imei: deletedBidEquipment.imei || '',
                    quantity: deletedBidEquipment.quantity || 1,
                    returnReason: returnReason || 'Причина не указана'
                })
            }
        });

        res.json({
            message: 'Bid equipment deleted',
            bidEquipment: deletedBidEquipment,
            returnReason
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Bid equipment not found' });
        }
        console.error('Delete bid equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;