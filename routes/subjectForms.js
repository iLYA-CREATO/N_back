const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Get all subject forms
router.get('/', authMiddleware, async (req, res) => {
    try {
        const subjectForms = await prisma.subjectForm.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(subjectForms);
    } catch (error) {
        console.error('Get subject forms error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create subject form
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название обязательно' });
        }

        // Check for duplicates
        const existing = await prisma.subjectForm.findUnique({
            where: { name: name.trim() },
        });

        if (existing) {
            return res.status(400).json({ message: 'Такая форма субъекта уже существует' });
        }

        const subjectForm = await prisma.subjectForm.create({
            data: {
                name: name.trim(),
            },
        });

        res.status(201).json(subjectForm);
    } catch (error) {
        console.error('Create subject form error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update subject form
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name } = req.body;
        const id = parseInt(req.params.id);

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Название обязательно' });
        }

        // Check for duplicates (excluding current record)
        const existing = await prisma.subjectForm.findFirst({
            where: {
                name: name.trim(),
                NOT: { id },
            },
        });

        if (existing) {
            return res.status(400).json({ message: 'Такая форма субъекта уже существует' });
        }

        const subjectForm = await prisma.subjectForm.update({
            where: { id },
            data: {
                name: name.trim(),
            },
        });

        res.json(subjectForm);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Форма субъекта не найдена' });
        }
        console.error('Update subject form error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete subject form
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        await prisma.subjectForm.delete({
            where: { id },
        });

        res.json({ message: 'Форма субъекта удалена' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Форма субъекта не найдена' });
        }
        console.error('Delete subject form error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
