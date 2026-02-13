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

// Получить все категории спецификаций
router.get('/', authenticateToken, async (req, res) => {
    try {
        const categories = await prisma.specificationCategory.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching specification categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить дерево категорий
router.get('/tree', authenticateToken, async (req, res) => {
    try {
        const categories = await prisma.specificationCategory.findMany({
            include: {
                children: {
                    include: {
                        children: true, // Рекурсивно включаем детей
                    },
                },
            },
            where: {
                parentId: null, // Только корневые категории
            },
            orderBy: {
                name: 'asc',
            },
        });
        res.json(categories);
    } catch (error) {
        console.error('Error fetching specification categories tree:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить категорию по ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const category = await prisma.specificationCategory.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        console.error('Error fetching specification category:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создать категорию
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, parentId } = req.body;

        const category = await prisma.specificationCategory.create({
            data: {
                name,
                description,
                parentId: parentId ? parseInt(parentId) : null,
            },
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating specification category:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Category name already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Обновить категорию
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, parentId } = req.body;

        const category = await prisma.specificationCategory.update({
            where: { id: parseInt(req.params.id) },
            data: {
                name,
                description,
                parentId: parentId ? parseInt(parentId) : null,
            },
        });
        res.json(category);
    } catch (error) {
        console.error('Error updating specification category:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Category name already exists' });
        } else if (error.code === 'P2025') {
            res.status(404).json({ error: 'Category not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Удалить категорию
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.specificationCategory.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting specification category:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Category not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;