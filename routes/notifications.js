/**
 * Маршруты для работы с уведомлениями (Notifications)
 *
 * Этот модуль содержит все API endpoints для CRUD операций с уведомлениями.
 */

// Импорт Express для создания маршрутов
const express = require('express');
const router = express.Router();
// Импорт middleware для аутентификации
const authMiddleware = require('../middleware/auth');
// Импорт Prisma клиента для работы с базой данных
const prisma = require('../prisma/client');

// Получить все уведомления пользователя
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { filter = 'all', limit = 50 } = req.query;

        console.log(`Getting notifications for user ${userId}`);

        // Базовый запрос
        let whereClause = { userId };

        // Применяем фильтр
        if (filter === 'unread') {
            whereClause.isRead = false;
        } else if (filter === 'read') {
            whereClause.isRead = true;
        }
        // 'all' - без фильтра по isRead

        const notifications = await prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
        });

        // Получаем общее количество непрочитанных уведомлений
        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        res.json({
            success: true,
            data: notifications,
            unreadCount,
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении уведомлений',
        });
    }
});

// Получить количество непрочитанных уведомлений
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false },
        });

        res.json({
            success: true,
            data: { unreadCount },
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при получении количества уведомлений',
        });
    }
});

// Пометить уведомление как прочитанное
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const notification = await prisma.notification.update({
            where: { id: parseInt(id), userId },
            data: { isRead: true },
        });

        res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении уведомления',
        });
    }
});

// Пометить все уведомления как прочитанные
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        res.json({
            success: true,
            message: 'Все уведомления помечены как прочитанные',
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при обновлении уведомлений',
        });
    }
});

// Удалить уведомление
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await prisma.notification.delete({
            where: { id: parseInt(id), userId },
        });

        res.json({
            success: true,
            message: 'Уведомление удалено',
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при удалении уведомления',
        });
    }
});

// Создать уведомление (внутренний endpoint для использования другими модулями)
router.post('/create', async (req, res) => {
    try {
        const { userId, title, message, type, bidId } = req.body;

        const notification = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type: type || 'general',
                bidId: bidId || null,
            },
        });

        res.json({
            success: true,
            data: notification,
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка при создании уведомления',
        });
    }
});

module.exports = router;
