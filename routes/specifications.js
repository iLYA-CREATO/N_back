const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware для проверки токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Получить все спецификации
router.get('/', authenticateToken, async (req, res) => {
    try {
        const specifications = await prisma.specification.findMany({
            include: {
                category: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(specifications);
    } catch (error) {
        console.error('Error fetching specifications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить спецификацию по ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const specification = await prisma.specification.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                category: true,
            },
        });
        if (!specification) {
            return res.status(404).json({ error: 'Specification not found' });
        }
        res.json(specification);
    } catch (error) {
        console.error('Error fetching specification:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создать спецификацию
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { categoryId, name, cost } = req.body;

        const specification = await prisma.specification.create({
            data: {
                categoryId: parseInt(categoryId),
                name,
                discount: 0,
                cost: parseFloat(cost),
            },
            include: {
                category: true,
            },
        });
        res.status(201).json(specification);
    } catch (error) {
        console.error('Error creating specification:', error);
        if (error.code === 'P2003') {
            res.status(400).json({ error: 'Invalid category ID' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Обновить спецификацию
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { categoryId, name, discount, cost } = req.body;

        const specification = await prisma.specification.update({
            where: { id: parseInt(req.params.id) },
            data: {
                categoryId: parseInt(categoryId),
                name,
                discount: parseFloat(discount),
                cost: parseFloat(cost),
            },
            include: {
                category: true,
            },
        });
        res.json(specification);
    } catch (error) {
        console.error('Error updating specification:', error);
        if (error.code === 'P2003') {
            res.status(400).json({ error: 'Invalid category ID' });
        } else if (error.code === 'P2025') {
            res.status(404).json({ error: 'Specification not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Удалить спецификацию
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.specification.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting specification:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Specification not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;