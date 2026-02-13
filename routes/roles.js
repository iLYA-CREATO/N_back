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

// Получить все роли
router.get('/', authenticateToken, async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить роль по ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const role = await prisma.role.findUnique({
            where: { id: parseInt(req.params.id) },
        });
        if (!role) {
            return res.status(404).json({ error: 'Role not found' });
        }
        res.json(role);
    } catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создать роль
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await prisma.role.create({
            data: { name, description, permissions },
        });
        res.status(201).json(role);
    } catch (error) {
        console.error('Error creating role:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Role name already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Обновить роль
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await prisma.role.update({
            where: { id: parseInt(req.params.id) },
            data: { name, description, permissions },
        });
        res.json(role);
    } catch (error) {
        console.error('Error updating role:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Role name already exists' });
        } else if (error.code === 'P2025') {
            res.status(404).json({ error: 'Role not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Удалить роль
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.role.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting role:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Role not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;