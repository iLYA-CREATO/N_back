const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Получение всех поставщиков
router.get('/', authMiddleware, async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получение одного поставщика
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const supplier = await prisma.supplier.findUnique({
            where: { id: parseInt(req.params.id) },
        });

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        res.json(supplier);
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Создание поставщика
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, entityType, inn, phone, email } = req.body;

        const newSupplier = await prisma.supplier.create({
            data: {
                name,
                entityType,
                inn,
                phone,
                email,
            },
        });

        res.status(201).json(newSupplier);
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Обновление поставщика
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, entityType, inn, phone, email } = req.body;

        const updatedSupplier = await prisma.supplier.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(name !== undefined && { name }),
                ...(entityType !== undefined && { entityType }),
                ...(inn !== undefined && { inn }),
                ...(phone !== undefined && { phone }),
                ...(email !== undefined && { email }),
            },
        });

        res.json(updatedSupplier);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        console.error('Update supplier error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удаление поставщика
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedSupplier = await prisma.supplier.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({
            message: 'Supplier deleted',
            supplier: deletedSupplier,
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Supplier not found' });
        }
        console.error('Delete supplier error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;