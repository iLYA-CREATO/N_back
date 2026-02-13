const express = require('express');
const auth = require('../middleware/auth');
const prisma = require('../prisma/client');

const router = express.Router();

// Получение всех типов заявок
router.get('/', auth, async (req, res) => {
    try {
        console.log('Getting all bid types');
        const bidTypes = await prisma.bidType.findMany({
            orderBy: { createdAt: 'desc' }
        });
        console.log('Bid types found:', bidTypes.length);
        // Validate and sanitize the data
        const sanitizedBidTypes = bidTypes.map(bt => ({
            ...bt,
            statuses: Array.isArray(bt.statuses) ? bt.statuses : [],
            transitions: Array.isArray(bt.transitions) ? bt.transitions : []
        }));
        res.json(sanitizedBidTypes);
    } catch (error) {
        console.error('Error fetching bid types:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создание нового типа заявки
router.post('/', auth, async (req, res) => {
    try {
        const { name, description, statuses, transitions, plannedReactionTimeMinutes, plannedDurationMinutes } = req.body;
        const bidType = await prisma.bidType.create({
            data: {
                name,
                description,
                statuses: statuses || [],
                transitions: transitions || [],
                plannedReactionTimeMinutes: plannedReactionTimeMinutes ? parseInt(plannedReactionTimeMinutes) : null,
                plannedDurationMinutes: plannedDurationMinutes ? parseFloat(plannedDurationMinutes) : null
            }
        });

        res.status(201).json(bidType);
    } catch (error) {
        console.error('Error creating bid type:', error);
        if (error.code === 'P2002') {
            res.status(400).json({ error: 'Bid type with this name already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Обновление типа заявки
router.put('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, statuses, transitions, plannedReactionTimeMinutes, plannedDurationMinutes } = req.body;
        const bidType = await prisma.bidType.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                statuses: statuses || [],
                transitions: transitions || [],
                plannedReactionTimeMinutes: plannedReactionTimeMinutes ? parseInt(plannedReactionTimeMinutes) : null,
                plannedDurationMinutes: plannedDurationMinutes ? parseFloat(plannedDurationMinutes) : null
            }
        });
        res.json(bidType);
    } catch (error) {
        console.error('Error updating bid type:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Bid type not found' });
        } else if (error.code === 'P2002') {
            res.status(400).json({ error: 'Bid type with this name already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Удаление типа заявки
router.delete('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.bidType.delete({
            where: { id: parseInt(id) }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting bid type:', error);
        if (error.code === 'P2025') {
            res.status(404).json({ error: 'Bid type not found' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// Получение всех статусов заявок для типа заявки
router.get('/:bidTypeId/statuses', auth, async (req, res) => {
    try {
        const { bidTypeId } = req.params;
        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }
        const statuses = bidType.statuses || [];
        // Сортировка по позиции
        statuses.sort((a, b) => a.position - b.position);
        res.json(statuses);
    } catch (error) {
        console.error('Error fetching bid statuses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создание нового статуса заявки
router.post('/:bidTypeId/statuses', auth, async (req, res) => {
    try {
        const { bidTypeId } = req.params;
        const { name, position, allowedActions } = req.body;

        // Проверка существования типа заявки
        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }

        // Проверка валидности позиции
        if (position < 1 || position > 999) {
            return res.status(400).json({ error: 'Position must be between 1 and 999' });
        }

        const statuses = bidType.statuses || [];

        // Проверка, что позиция уже существует
        if (statuses.some(s => s.position === position)) {
            return res.status(400).json({ error: `Status with position ${position} already exists` });
        }

        // Проверка, что имя уже существует
        if (statuses.some(s => s.name === name)) {
            return res.status(400).json({ error: 'Status with this name already exists' });
        }

        const newStatus = { name, position, allowedActions: allowedActions || [] };
        statuses.push(newStatus);

        await prisma.bidType.update({
            where: { id: parseInt(bidTypeId) },
            data: { statuses }
        });

        res.status(201).json(newStatus);
    } catch (error) {
        console.error('Error creating bid status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Обновление статуса заявки
router.put('/:bidTypeId/statuses/:position', auth, async (req, res) => {
    try {
        const { bidTypeId, position } = req.params;
        const { name, allowedActions } = req.body;

        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }

        const statuses = bidType.statuses || [];
        const statusIndex = statuses.findIndex(s => s.position === parseInt(position));

        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Bid status not found' });
        }

        // Для статусов по умолчанию (позиция 1 или 999) разрешено обновлять только имя и allowedActions
        if (parseInt(position) === 1 || parseInt(position) === 999) {
            statuses[statusIndex].name = name;
            statuses[statusIndex].allowedActions = allowedActions || statuses[statusIndex].allowedActions;
        } else {
            statuses[statusIndex].name = name;
            statuses[statusIndex].allowedActions = allowedActions || statuses[statusIndex].allowedActions;
        }

        await prisma.bidType.update({
            where: { id: parseInt(bidTypeId) },
            data: { statuses }
        });

        res.json(statuses[statusIndex]);
    } catch (error) {
        console.error('Error updating bid status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Удаление статуса заявки
router.delete('/:bidTypeId/statuses/:position', auth, async (req, res) => {
    try {
        const { bidTypeId, position } = req.params;

        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }

        const statuses = bidType.statuses || [];
        const statusIndex = statuses.findIndex(s => s.position === parseInt(position));

        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Bid status not found' });
        }

        // Предотвращение удаления открытых или закрытых статусов
        if (parseInt(position) === 1 || parseInt(position) === 999) {
            return res.status(400).json({ error: 'Cannot delete default open or closed status' });
        }

        statuses.splice(statusIndex, 1);

        await prisma.bidType.update({
            where: { id: parseInt(bidTypeId) },
            data: { statuses }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting bid status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение переходов для типа заявки
router.get('/:bidTypeId/transitions', auth, async (req, res) => {
    try {
        const { bidTypeId } = req.params;
        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }
        const transitions = bidType.transitions || [];
        res.json(transitions);
    } catch (error) {
        console.error('Error fetching transitions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Создание перехода
router.post('/:bidTypeId/transitions', auth, async (req, res) => {
    try {
        const { bidTypeId } = req.params;
        const { fromPosition, toPosition } = req.body;

        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }

        const statuses = bidType.statuses || [];
        const fromStatus = statuses.find(s => s.position === fromPosition);
        const toStatus = statuses.find(s => s.position === toPosition);
        if (!fromStatus || !toStatus) {
            return res.status(400).json({ error: 'Invalid status positions' });
        }

        const transitions = bidType.transitions || [];
        if (transitions.some(t => t.fromPosition === fromPosition && t.toPosition === toPosition)) {
            return res.status(400).json({ error: 'Transition already exists' });
        }

        const newTransition = { fromPosition, toPosition };
        transitions.push(newTransition);

        await prisma.bidType.update({
            where: { id: parseInt(bidTypeId) },
            data: { transitions }
        });

        res.status(201).json(newTransition);
    } catch (error) {
        console.error('Error creating transition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Удаление перехода
router.delete('/:bidTypeId/transitions/:fromPosition/:toPosition', auth, async (req, res) => {
    try {
        const { bidTypeId, fromPosition, toPosition } = req.params;

        const bidType = await prisma.bidType.findUnique({
            where: { id: parseInt(bidTypeId) }
        });
        if (!bidType) {
            return res.status(404).json({ error: 'Bid type not found' });
        }

        const transitions = bidType.transitions || [];
        const index = transitions.findIndex(t => t.fromPosition === parseInt(fromPosition) && t.toPosition === parseInt(toPosition));
        if (index === -1) {
            return res.status(404).json({ error: 'Transition not found' });
        }

        transitions.splice(index, 1);

        await prisma.bidType.update({
            where: { id: parseInt(bidTypeId) },
            data: { transitions }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting transition:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;