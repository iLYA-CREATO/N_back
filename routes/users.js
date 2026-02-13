const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
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

// Получить всех пользователей
router.get('/', authenticateToken, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получить пользователя по ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(req.params.id) },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создать пользователя
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { username, fullName, email, password, role } = req.body;

        // Хэширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                fullName,
                email,
                password: hashedPassword,
                role: role || 'user',
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Username or email already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Обновить пользователя
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { username, fullName, email, password, role } = req.body;
        const updateData = { username, fullName, email, role };

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: parseInt(req.params.id) },
            data: updateData,
            select: {
                id: true,
                username: true,
                fullName: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json(user);
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Username or email already exists' });
        } else if (error.code === 'P2025') {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Удалить пользователя
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.user.delete({
            where: { id: parseInt(req.params.id) },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'User not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

module.exports = router;