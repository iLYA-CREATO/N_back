/**
 * Маршруты для аналитики
 *
 * Этот модуль содержит API endpoints для получения статистических данных.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Функция для получения диапазона дат на основе периода и конкретной даты
const getDateRange = (period, specificDate) => {
    const now = new Date();
    let startDate, endDate;

    if (specificDate) {
        // Используем конкретную дату как начальную точку
        const date = new Date(specificDate);
        date.setHours(0, 0, 0, 0);
        
        switch (period) {
            case 'day':
                startDate = date;
                endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = date;
                endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = date;
                endDate = new Date(date);
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'halfYear':
                startDate = date;
                endDate = new Date(date);
                endDate.setMonth(endDate.getMonth() + 6);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate = date;
                endDate = new Date(date);
                endDate.setFullYear(endDate.getFullYear() + 1);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                // Для 'all' или других значений - без ограничений
                return { startDate: null, endDate: null };
        }
    } else {
        // Без конкретной даты - используем последний период от текущей даты
        switch (period) {
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'halfYear':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'all':
            default:
                return { startDate: null, endDate: null };
        }
    }

    return { startDate, endDate };
};

// Получить статистику для аналитики
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { period = 'all', specificDate = '' } = req.query;
        console.log('Getting analytics statistics, period:', period, 'specificDate:', specificDate);
        
        const { startDate, endDate } = getDateRange(period, specificDate);
        
        // Построим условие WHERE для фильтрации по дате
        let whereClause = {};
        if (startDate) {
            if (endDate) {
                whereClause = {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                };
            } else {
                whereClause = {
                    createdAt: {
                        gte: startDate
                    }
                };
            }
        }
        
        // Получаем количество заявок за период
        const totalBids = await prisma.bid.count({
            where: whereClause
        });
        
        // Получаем количество выданного оборудования за период
        const issuedEquipment = await prisma.bidEquipment.aggregate({
            _sum: {
                quantity: true
            },
            where: whereClause
        });
        
        const issuedEquipmentCount = issuedEquipment._sum.quantity || 0;
        
        // Получаем количество созданных спецификаций за период
        const totalSpecifications = await prisma.bidSpecification.count({
            where: whereClause
        });
        
        // Получаем количество завершенных заявок (достигших последнего статуса)
        // Ищем заявки со статусом "Закрыта" или подобным конечным статусом
        const completedBids = await prisma.bid.count({
            where: {
                ...whereClause,
                status: 'Закрыта'
            }
        });
        
        // Получаем среднее время выполнения заявки (от создания до закрытия)
        // Для закрытых заявок считаем разницу между createdAt и updatedAt
        let avgCompletionHours = 0;
        const completedBidsWithTime = await prisma.bid.findMany({
            where: {
                ...whereClause,
                status: 'Закрыта'
            },
            select: {
                createdAt: true,
                updatedAt: true
            }
        });
        
        if (completedBidsWithTime.length > 0) {
            const totalHours = completedBidsWithTime.reduce((sum, bid) => {
                const hours = (new Date(bid.updatedAt) - new Date(bid.createdAt)) / (1000 * 60 * 60);
                return sum + hours;
            }, 0);
            avgCompletionHours = totalHours / completedBidsWithTime.length;
        }
        
        // Получаем статистику по пользователям - кто сколько заявок создал
        const userBidsStats = await prisma.bid.groupBy({
            by: ['createdBy'],
            _count: {
                id: true
            },
            where: whereClause,
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });
        
        // Получаем имена пользователей
        const userIds = userBidsStats.map(stat => stat.createdBy);
        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds }
            },
            select: {
                id: true,
                fullName: true,
                username: true
            }
        });
        
        // Объединяем статистику с именами пользователей
        const userStats = userBidsStats.map(stat => {
            const user = users.find(u => u.id === stat.createdBy);
            return {
                userId: stat.createdBy,
                userName: user?.fullName || user?.username || 'Неизвестный',
                bidCount: stat._count.id
            };
        });
        
        res.json({
            totalBids,
            issuedEquipmentCount,
            totalSpecifications,
            completedBids,
            avgCompletionHours,
            userStats,
            period
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
