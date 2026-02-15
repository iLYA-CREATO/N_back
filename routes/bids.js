/**
 * Маршруты для работы с заявками (Bids)
 *
 * Этот модуль содержит все API endpoints для CRUD операций с заявками,
 * а также для назначения и возврата оборудования на заявки.
 */

// Импорт Express для создания маршрутов
const express = require('express');
const router = express.Router();
// Импорт middleware для аутентификации
const authMiddleware = require('../middleware/auth');
// Импорт Prisma клиента для работы с базой данных
const prisma = require('../prisma/client');
// Импорт fs для логирования
const fs = require('fs');
const path = require('path');
// Импорт multer для загрузки файлов
const multer = require('multer');
// Импорт sharp для сжатия изображений
const sharp = require('sharp');


        const metadata = await sharp(inputPath).metadata();
        
        // Вычисляем новые размеры (уменьшаем в 5 раз)
        const newWidth = Math.max(1, Math.round(metadata.width / 5));
        const newHeight = Math.max(1, Math.round(metadata.height / 5));
        
        // Сжимаем изображение
        await sharp(inputPath)
            .resize(newWidth, newHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toFile(outputPath);
        
        // Получаем размер сжатого файла
        const stats = fs.statSync(outputPath);
        return stats.size;
    } catch (error) {
        console.error('Error compressing image:', error);
        // Если сжатие не удалось, возвращаем null и оригинальный файл будет использован
        return null;
    }
};

// Функция для проверки, является ли файл изображением
const isImageFile = (mimeType) => {
    return mimeType.startsWith('image/') && 
           (mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('png') || mimeType.includes('gif') || mimeType.includes('webp'));
};

// Функция для логирования данных заявки в файл
const logBidData = (action, data) => {
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    const logFile = path.join(logDir, 'bid_data.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${action}\n${JSON.stringify(data, null, 2)}\n\n`;
    fs.appendFileSync(logFile, logEntry);
};

// Получить все заявки
router.get('/', authMiddleware, async (req, res) => {
    try {
        console.log('Getting all bids');
        
        // Параметры пагинации
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const take = limit;
        
        // Параметры сортировки
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
        
        // Параметры фильтрации
        const search = req.query.search || '';
        const status = req.query.status || '';
        const bidTypeId = req.query.bidTypeId ? parseInt(req.query.bidTypeId) : null;
        const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
        const responsibleId = req.query.responsibleId ? parseInt(req.query.responsibleId) : null;
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;
        
        // Построение условий where
        const where = {};
        
        // Поиск по названию или описанию
        if (search) {
            where.OR = [
                { tema: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        // Фильтр по статусу
        if (status) {
            where.status = status;
        }
        
        // Фильтр по типу заявки
        if (bidTypeId) {
            where.bidTypeId = bidTypeId;
        }
        
        // Фильтр по клиенту
        if (clientId) {
            where.clientId = clientId;
        }
        
        // Фильтр по ответственному
        if (responsibleId) {
            where.currentResponsibleUserId = responsibleId;
        }
        
        // Фильтр по дате создания
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                where.createdAt.gte = dateFrom;
            }
            if (dateTo) {
                // Устанавливаем конец дня
                const endOfDay = new Date(dateTo);
                endOfDay.setHours(23, 59, 59, 999);
                where.createdAt.lte = endOfDay;
            }
        }
        
        // Получаем общее количество заявок для расчета пагинации
        const totalCount = await prisma.bid.count({ where });
        
        // Получаем заявки с пагинацией и сортировкой
        const bids = await prisma.bid.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip: skip,
            take: take,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                clientObject: {
                    include: {
                        equipment: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                currentResponsible: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                bidType: true,
            },
        });

        // Форматируем ответ для соответствия ожиданиям фронтенда
        const formattedBids = await Promise.all(bids.map(async (bid) => {
            // Определяем текущий статус
            let currentStatus = null;
            if (bid.bidType?.statuses && Array.isArray(bid.bidType.statuses)) {
                currentStatus = bid.bidType.statuses.find(s => s.name === bid.status) || null;
            }

            // Определяем bidTypeResponsibleName
            let bidTypeResponsibleName = null;
            
            // Сначала проверяем, есть ли назначенный ответственный на заявке
            if (bid.currentResponsibleUserId) {
                bidTypeResponsibleName = bid.currentResponsible ? bid.currentResponsible.fullName : 'Не указан';
            }
            // Если нет, проверяем ответственного пользователя в статусе
            else if (currentStatus?.responsibleUserId) {
                try {
                    const responsibleUser = await prisma.user.findUnique({
                        where: { id: parseInt(currentStatus.responsibleUserId) },
                        select: { fullName: true },
                    });
                    bidTypeResponsibleName = responsibleUser ? responsibleUser.fullName : 'Не указан';
                } catch (error) {
                    console.error('Error finding responsible user:', error);
                    bidTypeResponsibleName = 'Ошибка получения данных';
                }
            }
            // Если нет пользователя, проверяем роль (responsibleRoleId содержит название роли, не ID)
            else if (currentStatus?.responsibleRoleId) {
                try {
                    const role = await prisma.role.findUnique({
                        where: { name: currentStatus.responsibleRoleId },
                        select: { name: true },
                    });
                    bidTypeResponsibleName = role ? `Роль: ${role.name}` : 'Не указан';
                } catch (error) {
                    console.error('Error finding responsible role:', error);
                    bidTypeResponsibleName = 'Ошибка получения данных';
                }
            }

            return {
                id: bid.id,
                clientId: bid.clientId,
                clientName: bid.client ? bid.client.name : 'Клиент не найден',
                title: bid.tema,
                amount: parseFloat(bid.amount),
                status: bid.status,
                description: bid.description,
                clientObject: bid.clientObject,
                creatorName: bid.creator ? bid.creator.fullName : 'Создатель не найден',
                currentResponsibleUserId: bid.currentResponsibleUserId,
                currentResponsibleUserName: bid.currentResponsible ? bid.currentResponsible.fullName : null,
                bidTypeResponsibleName,
                createdAt: bid.createdAt,
                updatedAt: bid.updatedAt,
                workAddress: bid.workAddress,
                plannedResolutionDate: bid.plannedResolutionDate,
                plannedReactionTimeMinutes: bid.plannedReactionTimeMinutes,
                assignedAt: bid.assignedAt,
                plannedDurationMinutes: bid.plannedDurationMinutes,
                spentTimeHours: bid.spentTimeHours ? parseFloat(bid.spentTimeHours) : null,
                parentId: bid.parentId,
                bidType: bid.bidType,
                updNumber: bid.updNumber,
                updDate: bid.updDate,
            };
        }));

        res.json({
            data: formattedBids,
            pagination: {
                total: totalCount,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error('Get bids error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получить одну заявку по ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        console.log('Getting bid with ID:', req.params.id);
        // Ищем заявку по ID с полными связанными данными
        const bid = await prisma.bid.findUnique({
            where: { id: parseInt(req.params.id) }, // Преобразуем ID в число
            include: {
                client: {
                    include: {
                        responsible: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                }, // Данные клиента с ответственным
                clientObject: {
                    include: {
                        equipment: true,
                    },
                }, // Полные данные объекта клиента
                bidType: true, // Данные типа заявки
                creator: { // Данные создателя
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
                parent: { // Родительская заявка
                    select: {
                        id: true,
                        tema: true,
                    },
                },
                children: { // Дочерние заявки
                    select: {
                        id: true,
                        tema: true,
                        status: true,
                        createdAt: true,
                    },
                },
                bidEquipments: {
                    include: {
                        equipment: true,
                    },
                }, // Оборудование заявки
            },
        });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' }); // Заявка не найдена
        }

        // Получаем спецификации заявки для определения исполнителей
        const specifications = await prisma.bidSpecification.findMany({
            where: { bidId: parseInt(req.params.id) },
            include: {
                specification: true,
            },
        });

        // Получаем всех исполнителей из спецификаций
        const allExecutorIds = specifications.flatMap(spec => spec.executorIds);
        const uniqueExecutorIds = [...new Set(allExecutorIds)];

        let executors = [];
        if (uniqueExecutorIds.length > 0) {
            executors = await prisma.user.findMany({
                where: { id: { in: uniqueExecutorIds } },
                select: {
                    id: true,
                    fullName: true,
                    role: true,
                },
            });
        }

        // Определяем ответственного специалиста
        let responsibleSpecialist = null;
        if (executors.length > 0) {
            responsibleSpecialist = executors[0]; // Первый исполнитель
        } else if (bid.client.responsible) {
            responsibleSpecialist = bid.client.responsible;
        }

        // Определяем текущий статус
        let currentStatus = null;
        if (bid.bidType?.statuses && Array.isArray(bid.bidType.statuses)) {
            currentStatus = bid.bidType.statuses.find(s => s.name === bid.status) || null;
        }

        // Получаем ответственного за текущий статус типа заявки
        let bidTypeResponsibleName = null;
        
        // Сначала проверяем, есть ли назначенный ответственный на заявке
        if (bid.currentResponsibleUserId) {
            try {
                const responsibleUser = await prisma.user.findUnique({
                    where: { id: bid.currentResponsibleUserId },
                    select: { fullName: true },
                });
                bidTypeResponsibleName = responsibleUser ? responsibleUser.fullName : 'Не указан';
            } catch (error) {
                console.error('Error finding responsible user:', error);
                bidTypeResponsibleName = 'Ошибка получения данных';
            }
        }
        // Если нет, проверяем ответственного пользователя в статусе
        else if (currentStatus?.responsibleUserId) {
            try {
                const responsibleUser = await prisma.user.findUnique({
                    where: { id: parseInt(currentStatus.responsibleUserId) },
                    select: { fullName: true },
                });
                bidTypeResponsibleName = responsibleUser ? responsibleUser.fullName : 'Не указан';
            } catch (error) {
                console.error('Error finding responsible user:', error);
                bidTypeResponsibleName = 'Ошибка получения данных';
            }
        }
        // Если нет пользователя, проверяем роль (responsibleRoleId содержит название роли, не ID)
        else if (currentStatus?.responsibleRoleId) {
            try {
                const role = await prisma.role.findUnique({
                    where: { name: currentStatus.responsibleRoleId },
                    select: { name: true },
                });
                bidTypeResponsibleName = role ? `Роль: ${role.name}` : 'Не указан';
            } catch (error) {
                console.error('Error finding responsible role:', error);
                bidTypeResponsibleName = 'Ошибка получения данных';
            }
        }

        // Определяем сроки обработки на основе типа заявки и статуса
        let deadlines = {};
        if (bid.bidType?.name === 'Выдача со склада') {
            if (bid.status === 'Выдача') {
                deadlines = {
                    processingTime: '1 рабочий день',
                    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 день
                };
            } else {
                deadlines = {
                    processingTime: '3 рабочих дня',
                    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // +3 дня
                };
            }
        } else {
            deadlines = {
                processingTime: '5 рабочих дней',
                deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 дней
            };
        }

        // Определяем необходимые действия на основе статуса
        let necessaryActions = [];
        if (currentStatus?.allowedActions) {
            necessaryActions = currentStatus.allowedActions.map(action => {
                switch (action) {
                    case 'edit':
                        return 'Редактирование заявки';
                    case 'assign_executor':
                        return 'Назначение исполнителя';
                    case 'close':
                        return 'Закрытие заявки';
                    default:
                        return action;
                }
            });
        }

        // Определяем дополнительные ресурсы и уведомления на основе типа заявки
        let additionalResources = [];
        let notifications = [];

        if (bid.bidType?.name === 'Выдача со склада') {
            additionalResources = ['Складской терминал', 'Документы на оборудование'];
            if (bid.status === 'Выдача') {
                notifications = ['Уведомить клиента о готовности оборудования', 'Отправить подтверждение выдачи'];
            } else {
                notifications = ['Проверить наличие оборудования на складе'];
            }
        } else if (bid.bidType?.name === 'Стандартная заявка') {
            additionalResources = ['Документация', 'Техническая поддержка'];
            notifications = ['Уведомить ответственного менеджера'];
        } else {
            additionalResources = ['Общие ресурсы'];
            notifications = ['Стандартное уведомление'];
        }

        // Отправляем данные заявки с дополнительными полями
        const responseData = {
            ...bid,
            title: bid.tema, // Для совместимости с фронтендом
            clientName: bid.client.name, // Добавляем имя клиента
            clientResponsibleName: bid.client.responsible ? bid.client.responsible.fullName : 'Не указан', // Добавляем ответственного клиента
            creatorName: bid.creator.fullName, // Добавляем ФИО создателя
            amount: parseFloat(bid.amount), // Преобразуем сумму в число
            bidType: bid.bidType, // Добавляем тип заявки
            bidTypeResponsibleName, // Добавляем ответственного за тип заявки
            statusMetadata: {
                responsibleSpecialist,
                deadlines,
                necessaryActions,
                additionalResources,
                notifications,
            },
        };

        const bidResponseData = {
            clientId: responseData.clientId,
            clientName: responseData.clientName,
            tema: responseData.title,
            amount: responseData.amount,
            status: responseData.status,
            description: responseData.description,
            clientObjectId: responseData.clientObjectId,
            updNumber: responseData.updNumber,
            updDate: responseData.updDate,
            contract: responseData.contract,
            workAddress: responseData.workAddress,
            bidType: responseData.bidType,
            bidTypeName: responseData.bidType ? responseData.bidType.name : 'Не указан',
            bidTypeStatuses: responseData.bidType ? responseData.bidType.statuses : [],
            bidTypeResponsibleName: responseData.bidTypeResponsibleName,
            currentResponsibleUserId: bid.currentResponsibleUserId,
            clientResponsibleName: responseData.clientResponsibleName,
            creatorName: responseData.creatorName,
            createdAt: responseData.createdAt,
            updatedAt: responseData.updatedAt,
            statusMetadata: responseData.statusMetadata,
        };
        console.log('Отправка данных заявки ID:', req.params.id);
        console.log('Данные заявки:', {
            ...bidResponseData,
        });
        logBidData('Отправка данных заявки ID: ' + req.params.id, bidResponseData);

        res.json({ ...responseData, ...bidResponseData });
    } catch (error) {
        console.error('Get bid error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Создать новую заявку
router.post('/', authMiddleware, async (req, res) => {
    try {
        // Проверяем аутентификацию пользователя
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Извлекаем данные из тела запроса
        const { clientId, title, amount, status, description, clientObjectId, bidTypeId, updNumber, updDate, contract, workAddress, contactFullName, contactPhone, parentId, plannedResolutionDate, plannedReactionTimeMinutes, assignedAt, plannedDurationMinutes, spentTimeHours } = req.body;

        // Логируем данные, отправленные в заявку
        const bidInputData = {
            clientId,
            title,
            amount,
            status: status || 'Открыта',
            description,
            clientObjectId,
            bidTypeId,
            updNumber,
            updDate,
            contract,
            workAddress,
            contactFullName,
            contactPhone,
            parentId,
            createdBy: req.user.id,
            plannedResolutionDate,
            plannedReactionTimeMinutes,
            assignedAt, plannedDurationMinutes,
            spentTimeHours
        };
        console.log('Создание новой заявки. Данные, отправленные в заявку:', bidInputData);
        logBidData('Создание новой заявки', bidInputData);

        // Проверяем существование клиента
        const client = await prisma.client.findUnique({
            where: { id: parseInt(clientId) },
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' }); // Клиент не найден
        }

        // Если указан объект клиента, проверяем его принадлежность и доступность
        if (clientObjectId) {
            const clientObject = await prisma.clientObject.findUnique({
                where: { id: parseInt(clientObjectId) },
            });

            // Проверяем, что объект принадлежит этому клиенту
            if (!clientObject || clientObject.clientId !== parseInt(clientId)) {
                return res.status(400).json({ message: 'Client object does not belong to this client' });
            }

            // Проверяем, что объект не назначен на другую заявку
            if (clientObject.bidId) {
                return res.status(400).json({ message: 'Client object is already assigned to another bid' });
            }
        }

        // Проверяем существование типа заявки и получаем SLA параметры
        let bidType = null;
        let slaReactionTimeMinutes = plannedReactionTimeMinutes;
        let slaDurationMinutes = plannedDurationMinutes;
        
        if (bidTypeId && String(bidTypeId).trim()) {
            bidType = await prisma.bidType.findUnique({
                where: { id: parseInt(bidTypeId) },
            });
            
            // Если SLA параметры не переданы, берем из типа заявки
            const strPlannedReactionTimeMinutes = plannedReactionTimeMinutes ? String(plannedReactionTimeMinutes).trim() : '';
            const strPlannedDurationMinutes = plannedDurationMinutes ? String(plannedDurationMinutes).trim() : '';
            if (!strPlannedReactionTimeMinutes) {
                slaReactionTimeMinutes = bidType?.plannedReactionTimeMinutes ? bidType.plannedReactionTimeMinutes.toString() : null;
            }
            if (!strPlannedDurationMinutes) {
                slaDurationMinutes = bidType?.plannedDurationMinutes ? bidType.plannedDurationMinutes.toString() : null;
            }
        }

        // Валидация обязательных полей
        if (!bidTypeId || !String(bidTypeId).trim()) {
            return res.status(400).json({ message: 'Тип заявки (bidTypeId) обязателен' });
        }
        
        // Создаем новую заявку в базе данных
        const newBid = await prisma.bid.create({
            data: {
                clientId: parseInt(clientId), // ID клиента
                bidTypeId: parseInt(bidTypeId), // ID типа заявки (обязателен)
                tema: title, // Заголовок заявки
                amount: (amount !== undefined && amount !== null && amount.toString().trim() !== '') ? parseFloat(amount) : 0, // Сумма (по умолчанию 0)
                status: status || 'Открыта', // Статус (по умолчанию 'Открыта')
                description, // Описание
                clientObjectId: clientObjectId && String(clientObjectId).trim() ? parseInt(clientObjectId) : null, // ID объекта клиента (опционально)
                parentId: parentId && parentId.toString().trim() ? parseInt(parentId) : null, // ID родительской заявки
                createdBy: req.user.id, // ID пользователя, создавшего заявку
                updNumber,
                updDate: updDate ? new Date(updDate) : null,
                contract,
                workAddress,
                contactFullName,
                contactPhone,
                plannedResolutionDate: plannedResolutionDate && String(plannedResolutionDate).trim() ? new Date(plannedResolutionDate.length === 16 ? plannedResolutionDate + ':00' : plannedResolutionDate) : null,
                plannedReactionTimeMinutes: slaReactionTimeMinutes && String(slaReactionTimeMinutes).trim() ? parseInt(slaReactionTimeMinutes) : null,
                assignedAt: assignedAt && String(assignedAt).trim() ? new Date(assignedAt.length === 16 ? assignedAt + ':00' : assignedAt) : null,
                plannedDurationMinutes: slaDurationMinutes && String(slaDurationMinutes).trim() ? parseFloat(slaDurationMinutes) : null,
                spentTimeHours: spentTimeHours && String(spentTimeHours).trim() ? parseFloat(spentTimeHours) : null,
            },
            include: { // Включаем связанные данные в ответ
                client: {
                    select: {
                        name: true, // Только имя клиента
                    },
                },
                clientObject: true, // Данные объекта клиента
                bidType: true, // Данные типа заявки
            },
        });

        // Отправляем созданную заявку с дополнительными полями
        res.status(201).json({
            ...newBid,
            clientName: newBid.client.name, // Добавляем имя клиента
            amount: parseFloat(newBid.amount), // Преобразуем сумму в число
            workAddress: newBid.workAddress, // Добавляем адрес проведения работ
        });
    } catch (error) {
        console.error('Create bid error:', error);
        console.error('Error details:', error.message, error.code, error.meta);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// Создать несколько заявок (тиражирование)
router.post('/batch', authMiddleware, async (req, res) => {
    try {
        // Проверяем аутентификацию пользователя
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Извлекаем данные из тела запроса
        const { 
            clientId, 
            title, 
            amount, 
            status, 
            description, 
            clientObjectIds, 
            bidTypeId, 
            updNumber, 
            updDate, 
            contract, 
            workAddress, 
            contactFullName, 
            contactPhone, 
            parentId, 
            plannedResolutionDate, 
            plannedReactionTimeMinutes, 
            assignedAt, 
            plannedDurationMinutes, 
            spentTimeHours 
        } = req.body;

        // Проверяем, что передан массив объектов
        if (!clientObjectIds || !Array.isArray(clientObjectIds) || clientObjectIds.length === 0) {
            return res.status(400).json({ message: 'clientObjectIds must be a non-empty array' });
        }

        // Логируем данные batch создания
        const batchInputData = {
            clientId,
            title,
            amount,
            status: status || 'Открыта',
            description,
            clientObjectIds,
            bidTypeId,
            count: clientObjectIds.length,
        };
        console.log('Создание batch заявок. Данные:', batchInputData);
        logBidData('Создание batch заявок', batchInputData);

        // Проверяем существование клиента
        const client = await prisma.client.findUnique({
            where: { id: parseInt(clientId) },
        });

        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        // Проверяем существование типа заявки и получаем SLA параметры
        let bidType = null;
        let slaReactionTimeMinutes = plannedReactionTimeMinutes;
        let slaDurationMinutes = plannedDurationMinutes;
        
        // Валидация обязательных полей
        if (!bidTypeId || !String(bidTypeId).trim()) {
            return res.status(400).json({ message: 'Тип заявки (bidTypeId) обязателен' });
        }
        
        let bidTypeIdStr = bidTypeId ? bidTypeId.toString() : null;
        if (bidTypeIdStr && bidTypeIdStr.trim()) {
            bidType = await prisma.bidType.findUnique({
                where: { id: parseInt(bidTypeIdStr) },
            });
            
            if (!plannedReactionTimeMinutes || !plannedReactionTimeMinutes.toString().trim()) {
                slaReactionTimeMinutes = bidType?.plannedReactionTimeMinutes ? bidType.plannedReactionTimeMinutes.toString() : null;
            }
            if (!plannedDurationMinutes || !plannedDurationMinutes.toString().trim()) {
                slaDurationMinutes = bidType?.plannedDurationMinutes ? bidType.plannedDurationMinutes.toString() : null;
            }
        }

        // Проверяем все объекты клиента
        const clientObjects = await prisma.clientObject.findMany({
            where: {
                id: { in: clientObjectIds.map(id => parseInt(id)) },
                clientId: parseInt(clientId),
            },
        });

        if (clientObjects.length !== clientObjectIds.length) {
            return res.status(400).json({ message: 'Some client objects do not belong to this client or do not exist' });
        }

        // Проверяем, что объекты не назначены на другие заявки
        const assignedObjects = clientObjects.filter(obj => obj.bidId);
        if (assignedObjects.length > 0) {
            return res.status(400).json({ 
                message: 'Some client objects are already assigned to other bids',
                assignedObjects: assignedObjects.map(obj => obj.id)
            });
        }

        // Создаем все заявки в транзакции
        const createdBids = await prisma.$transaction(
            clientObjectIds.map((clientObjectId, index) => {
                return prisma.bid.create({
                    data: {
                        clientId: parseInt(clientId),
                        bidTypeId: parseInt(bidTypeIdStr), // bidTypeIdStr is validated to be non-empty above
                        tema: title,
                        amount: (amount !== undefined && amount !== null && amount.toString().trim() !== '') ? parseFloat(amount) : 0,
                        status: status || 'Открыта',
                        description,
                        clientObjectId: parseInt(clientObjectId),
                        parentId: parentId && parentId.toString().trim() ? parseInt(parentId) : null,
                        createdBy: req.user.id,
                        updNumber,
                        updDate: updDate ? new Date(updDate) : null,
                        contract,
                        workAddress,
                        contactFullName,
                        contactPhone,
                        plannedResolutionDate: plannedResolutionDate && plannedResolutionDate.trim() 
                            ? new Date(plannedResolutionDate.length === 16 ? plannedResolutionDate + ':00' : plannedResolutionDate) 
                            : null,
                        plannedReactionTimeMinutes: slaReactionTimeMinutes && slaReactionTimeMinutes.toString().trim() 
                            ? parseInt(slaReactionTimeMinutes) 
                            : null,
                        assignedAt: assignedAt && assignedAt.trim() 
                            ? new Date(assignedAt.length === 16 ? assignedAt + ':00' : assignedAt) 
                            : null,
                        plannedDurationMinutes: slaDurationMinutes && slaDurationMinutes.toString().trim() 
                            ? Math.min(parseFloat(slaDurationMinutes), 999.99) 
                            : null,
                        spentTimeHours: spentTimeHours && spentTimeHours.toString().trim() 
                            ? parseFloat(spentTimeHours) 
                            : null,
                    },
                    include: {
                        client: {
                            select: { name: true },
                        },
                        clientObject: true,
                        bidType: true,
                    },
                });
            })
        );

        console.log(`Создано ${createdBids.length} заявок`);
        logBidData('Создано batch заявок', { count: createdBids.length, bids: createdBids.map(b => b.id) });

        // Форматируем ответ
        const formattedBids = createdBids.map(bid => ({
            ...bid,
            clientName: bid.client.name,
            amount: parseFloat(bid.amount),
            workAddress: bid.workAddress,
        }));

        res.status(201).json({
            message: `Создано ${createdBids.length} заявок`,
            bids: formattedBids,
        });
    } catch (error) {
        console.error('Batch create bids error:', error);
        console.error('Error details:', error.message, error.code, error.meta);
        res.status(500).json({ message: 'Server error', details: error.message });
    }
});

// Обновить заявку
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { clientId, title, amount, status, description, clientObjectId, bidTypeId, updNumber, updDate, contract, workAddress, contactFullName, contactPhone, plannedResolutionDate, plannedReactionTimeMinutes, assignedAt, plannedDurationMinutes, spentTimeHours, currentResponsibleUserId } = req.body;

        // Логируем данные обновления заявки
        const updateData = { clientId, title, amount, status, description, clientObjectId, bidTypeId, updNumber, updDate, contract, workAddress, contactFullName, contactPhone, plannedResolutionDate, plannedReactionTimeMinutes, assignedAt, plannedDurationMinutes, spentTimeHours, currentResponsibleUserId };
        console.log('Обновление заявки ID:', req.params.id, 'Данные:', updateData);
        logBidData('Обновление заявки ID: ' + req.params.id, updateData);

        // Если меняется клиент, проверяем его существование
        if (clientId) {
            const client = await prisma.client.findUnique({
                where: { id: parseInt(clientId) },
            });

            if (!client) {
                return res.status(404).json({ message: 'Client not found' });
            }
        }

        // Получаем текущую заявку для проверки
        const currentBid = await prisma.bid.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { client: true },
        });

        if (!currentBid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Определяем целевой ID клиента (новый или текущий)
        const targetClientId = clientId ? parseInt(clientId) : currentBid.clientId;

        // Если указан объект клиента, проверяем его принадлежность и доступность
        if (clientObjectId) {
            const clientObject = await prisma.clientObject.findUnique({
                where: { id: parseInt(clientObjectId) },
            });

            // Проверяем принадлежность целевому клиенту
            if (!clientObject || clientObject.clientId !== targetClientId) {
                return res.status(400).json({ message: 'Client object does not belong to the target client' });
            }

            // Проверяем, что объект не назначен на другую заявку (кроме текущей)
            if (clientObject.bidId && clientObject.bidId !== parseInt(req.params.id)) {
                return res.status(400).json({ message: 'Client object is already assigned to another bid' });
            }
        }

        // Определяем, меняется ли клиент
        const isClientChanging = clientId && parseInt(clientId) !== currentBid.clientId;

        // Обновляем заявку в базе данных
        const updatedBid = await prisma.bid.update({
            where: { id: parseInt(req.params.id) },
            data: {
                ...(clientId && String(clientId).trim() && { clientId: parseInt(clientId) }), // Обновляем клиента если указано
                ...(title && { tema: title }), // Обновляем заголовок если указано
                ...(amount !== undefined && amount !== null && { amount: (amount !== undefined && amount !== null && amount.toString().trim() !== '') ? parseFloat(amount) : 0 }), // Обновляем сумму если указано
                ...(status !== undefined && { status }), // Обновляем статус если указано
                ...(description !== undefined && { description }), // Обновляем описание если указано
                ...(bidTypeId !== undefined && bidTypeId !== null && String(bidTypeId).trim() && { bidTypeId: parseInt(bidTypeId) }), // Обновляем тип заявки если указано
                clientObjectId: clientObjectId && String(clientObjectId).trim() ? parseInt(clientObjectId) : null, // Обновляем объект клиента
                ...(updNumber !== undefined && { updNumber }), // Обновляем номер УПД если указано
                ...(updDate !== undefined && { updDate: updDate ? new Date(updDate) : null }), // Обновляем дату УПД если указано
                ...(contract !== undefined && { contract }), // Обновляем контракт если указано
                ...(workAddress !== undefined && { workAddress }), // Обновляем адрес проведения работ если указано
                ...(contactFullName !== undefined && { contactFullName }), // Обновляем ФИО контакта если указано
                ...(contactPhone !== undefined && { contactPhone }), // Обновляем телефон контакта если указано
                ...(plannedResolutionDate !== undefined && { plannedResolutionDate: plannedResolutionDate && String(plannedResolutionDate).trim() ? new Date(plannedResolutionDate.length === 16 ? plannedResolutionDate + ':00' : plannedResolutionDate) : null }),
                ...(plannedReactionTimeMinutes !== undefined && { plannedReactionTimeMinutes: plannedReactionTimeMinutes && String(plannedReactionTimeMinutes).trim() ? parseInt(plannedReactionTimeMinutes) : null }),
                ...(assignedAt !== undefined && { assignedAt: assignedAt && String(assignedAt).trim() ? new Date(assignedAt.length === 16 ? assignedAt + ':00' : assignedAt) : null }),
                ...(plannedDurationMinutes !== undefined && { plannedDurationMinutes: plannedDurationMinutes && String(plannedDurationMinutes).trim() ? parseInt(plannedDurationMinutes) : null }),
                ...(spentTimeHours !== undefined && { spentTimeHours: spentTimeHours && String(spentTimeHours).trim() ? parseFloat(spentTimeHours) : null }),
                ...(currentResponsibleUserId !== undefined && { currentResponsibleUserId: currentResponsibleUserId ? parseInt(currentResponsibleUserId) : null }),
            },
            include: {
                client: {
                    select: {
                        name: true,
                    },
                },
                clientObject: true,
                bidType: true,
                creator: {
                    select: {
                        fullName: true,
                    },
                },
            },
        });

        // Логируем изменение статуса в AuditLog
        if (status !== undefined && status !== currentBid.status) {
            await prisma.auditLog.create({
                data: {
                    bidId: parseInt(req.params.id),
                    userId: req.user.id,
                    action: 'Изменение статуса',
                    details: `Статус изменен с "${currentBid.status}" на "${status}"`,
                },
            });
        }




        // Отправляем обновленную заявку
        res.json({
            ...updatedBid,
            title: updatedBid.tema, // Для совместимости с фронтендом
            clientName: updatedBid.client.name,
            creatorName: updatedBid.creator.fullName,
            amount: parseFloat(updatedBid.amount),
            workAddress: updatedBid.workAddress, // Добавляем адрес проведения работ
        });
    } catch (error) {
        if (error.code === 'P2025') { // Ошибка Prisma: запись не найдена
            return res.status(404).json({ message: 'Bid not found' });
        }
        console.error('Update bid error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удалить заявку
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const deletedBid = await prisma.bid.delete({
            where: { id: parseInt(req.params.id) },
        });

        res.json({
            message: 'Bid deleted',
            bid: {
                ...deletedBid,
                amount: parseFloat(deletedBid.amount),
            },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Bid not found' });
        }
        console.error('Delete bid error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Получить комментарии к заявке
router.get('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);

        // Проверяем существование заявки
        const bid = await prisma.bid.findUnique({
            where: { id: bidId },
        });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Получаем комментарии с данными пользователя
        const comments = await prisma.comment.findMany({
            where: { bidId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json(comments);
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Добавить комментарий к заявке
router.post('/:id/comments', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        const { content } = req.body;

        // Проверяем аутентификацию
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Проверяем существование заявки
        const bid = await prisma.bid.findUnique({
            where: { id: bidId },
        });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Проверяем содержание комментария
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        // Создаем комментарий
        const comment = await prisma.comment.create({
            data: {
                bidId,
                userId: req.user.id,
                content: content.trim(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Обновить комментарий к заявке
router.put('/:id/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        const commentId = parseInt(req.params.commentId);
        const { content } = req.body;

        // Проверяем аутентификацию
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Проверяем существование комментария и что он принадлежит пользователю
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.bidId !== bidId) {
            return res.status(400).json({ message: 'Comment does not belong to this bid' });
        }

        if (comment.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own comments' });
        }

        // Проверяем содержание комментария
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        // Обновляем комментарий
        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: {
                content: content.trim(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });

        res.json(updatedComment);
    } catch (error) {
        console.error('Update comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удалить комментарий к заявке
router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        const commentId = parseInt(req.params.commentId);

        // Проверяем аутентификацию
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Проверяем существование комментария и что он принадлежит пользователю
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.bidId !== bidId) {
            return res.status(400).json({ message: 'Comment does not belong to this bid' });
        }

        if (comment.userId !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own comments' });
        }

        // Создаем запись в audit log перед удалением
        await prisma.auditLog.create({
            data: {
                bidId,
                userId: req.user.id,
                action: 'Удален комментарий',
                details: `Комментарий: "${comment.content}"`,
            },
        });

        // Удаляем комментарий
        await prisma.comment.delete({
            where: { id: commentId },
        });

        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получить спецификации заявки
router.get('/:id/specifications', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);

        // Проверяем существование заявки
        const bid = await prisma.bid.findUnique({
            where: { id: bidId },
        });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Получаем спецификации с данными
        const specifications = await prisma.bidSpecification.findMany({
            where: { bidId },
            include: {
                specification: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // Получаем исполнителей отдельно
        const specIds = specifications.map(s => s.id);
        const executorsData = await prisma.bidSpecification.findMany({
            where: { id: { in: specIds } },
            select: {
                id: true,
                executorIds: true,
            },
        });

        // Создаем карту исполнителей
        const executorsMap = {};
        for (const spec of executorsData) {
            if (spec.executorIds.length > 0) {
                const executors = await prisma.user.findMany({
                    where: { id: { in: spec.executorIds } },
                    select: { id: true, fullName: true },
                });
                executorsMap[spec.id] = executors;
            }
        }

        // Добавляем исполнителей к спецификациям
        const specificationsWithExecutors = specifications.map(spec => ({
            ...spec,
            executors: executorsMap[spec.id] || [],
        }));

        res.json(specificationsWithExecutors);
    } catch (error) {
        console.error('Get specifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Добавить спецификацию к заявке
router.post('/:id/specifications', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        const { specificationId, executorIds, comment, discount } = req.body;

        // Проверяем аутентификацию
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // Проверяем существование заявки
        const bid = await prisma.bid.findUnique({
            where: { id: bidId },
        });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Проверяем существование спецификации
        const specification = await prisma.specification.findUnique({
            where: { id: parseInt(specificationId) },
        });

        if (!specification) {
            return res.status(404).json({ message: 'Specification not found' });
        }

        // Проверяем исполнителей если указаны
        if (executorIds && executorIds.length > 0) {
            const executors = await prisma.user.findMany({
                where: { id: { in: executorIds.map(id => parseInt(id)) } },
            });
            if (executors.length !== executorIds.length) {
                return res.status(404).json({ message: 'Some executors not found' });
            }
        }

        // Создаем спецификацию заявки
        const discountValue = discount !== undefined ? parseFloat(discount) : 0;
        const bidSpecification = await prisma.$queryRaw`
            INSERT INTO "BidSpecification" ("bidId", "specificationId", "executorIds", "discount", "createdAt", "updatedAt")
            VALUES (${bidId}, ${parseInt(specificationId)}, ${executorIds ? executorIds.map(id => parseInt(id)) : []}, ${discountValue}, NOW(), NOW())
            RETURNING *
        `;

        // Получаем спецификацию с связанными данными
        const specWithDetails = await prisma.bidSpecification.findUnique({
            where: { id: bidSpecification[0].id },
            include: {
                specification: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        // Получаем исполнителей
        let executors = [];
        if (specWithDetails.executorIds.length > 0) {
            executors = await prisma.user.findMany({
                where: { id: { in: specWithDetails.executorIds } },
                select: { id: true, fullName: true },
            });
        }

        res.status(201).json({
            ...specWithDetails,
            discount: bidSpecification[0].discount,
            executors,
        });
    } catch (error) {
        console.error('Create bid specification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Обновить спецификацию заявки
router.put('/:id/specifications/:specId', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        const specId = parseInt(req.params.specId);
        const { executorIds, comment, discount } = req.body;

        // Проверяем существование спецификации заявки
        const existingSpec = await prisma.bidSpecification.findUnique({
            where: { id: specId },
        });

        if (!existingSpec || existingSpec.bidId !== bidId) {
            return res.status(404).json({ message: 'Bid specification not found' });
        }

        // Проверяем исполнителей если указаны
        if (executorIds && executorIds.length > 0) {
            const executors = await prisma.user.findMany({
                where: { id: { in: executorIds.map(id => parseInt(id)) } },
            });
            if (executors.length !== executorIds.length) {
                return res.status(404).json({ message: 'Some executors not found' });
            }
        }

        // Обновляем спецификацию
        const discountValue = discount !== undefined ? parseFloat(discount) : existingSpec.discount;
        await prisma.$executeRaw`
            UPDATE "BidSpecification"
            SET "executorIds" = ${executorIds ? executorIds.map(id => parseInt(id)) : []},
                "discount" = ${discountValue},
                "updatedAt" = NOW()
            WHERE "id" = ${specId}
        `;

        // Получаем обновленную спецификацию
        const updatedSpec = await prisma.bidSpecification.findUnique({
            where: { id: specId },
            include: {
                specification: {
                    include: {
                        category: true,
                    },
                },
            },
        });

        // Получаем исполнителей
        let executors = [];
        if (updatedSpec.executorIds.length > 0) {
            executors = await prisma.user.findMany({
                where: { id: { in: updatedSpec.executorIds } },
                select: { id: true, fullName: true },
            });
        }

        res.json({
            ...updatedSpec,
            discount: discountValue,
            executors,
        });
    } catch (error) {
        console.error('Update bid specification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удалить спецификацию заявки
router.delete('/:id/specifications/:specId', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        const specId = parseInt(req.params.specId);

        // Проверяем существование спецификации заявки
        const existingSpec = await prisma.bidSpecification.findUnique({
            where: { id: specId },
        });

        if (!existingSpec || existingSpec.bidId !== bidId) {
            return res.status(404).json({ message: 'Bid specification not found' });
        }

        // Удаляем спецификацию
        await prisma.bidSpecification.delete({
            where: { id: specId },
        });

        res.json({ message: 'Bid specification deleted' });
    } catch (error) {
        console.error('Delete bid specification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получить историю заявки
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);

        // Проверяем существование заявки
        const bid = await prisma.bid.findUnique({
            where: { id: bidId },
            include: {
                creator: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
        });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        const history = [];

        // Создание заявки
        history.push({
            date: bid.createdAt,
            user: bid.creator.fullName,
            action: 'Заявка создана',
        });

        // Комментарии
        const comments = await prisma.comment.findMany({
            where: { bidId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        comments.forEach(comment => {
            history.push({
                date: comment.createdAt,
                user: comment.user.fullName,
                action: `Добавлен комментарий: ${comment.content}`,
            });
        });

        // Спецификации
        const specifications = await prisma.bidSpecification.findMany({
            where: { bidId },
            include: {
                specification: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        specifications.forEach(spec => {
            history.push({
                date: spec.createdAt,
                user: bid.creator.fullName, // Предполагаем создателя
                action: `Добавлена спецификация: ${spec.specification.name}`,
            });
            if (spec.updatedAt > spec.createdAt) {
                history.push({
                    date: spec.updatedAt,
                    user: bid.creator.fullName,
                    action: `Спецификация изменена: ${spec.specification.name}`,
                });
            }
        });


        // Audit logs
        const auditLogs = await prisma.auditLog.findMany({
            where: { bidId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        auditLogs.forEach(log => {
            history.push({
                date: log.createdAt,
                user: log.user.fullName,
                action: log.action + (log.details ? `: ${log.details}` : ''),
            });
        });

        // Сортируем по дате
        history.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(history);
    } catch (error) {
        console.error('Get bid history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// === ФАЙЛЫ ЗАЯВКИ ===

// Настройка хранилища для файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const bidId = req.params.id;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'bids', bidId);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const bidId = req.params.id;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'bids', bidId);
        
        // Получаем расширение из оригинального файла
        const ext = path.extname(file.originalname).toLowerCase();
        const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tga', '.torrent', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
        const fileExt = validExts.includes(ext) ? ext : '.file';
        
        // Сканируем директорию и ищем существующие файлы image*
        let imageCount = 0;
        try {
            if (fs.existsSync(uploadDir)) {
                const files = fs.readdirSync(uploadDir);
                files.forEach(f => {
                    // Ищем файлы вида image, image1, image2 и т.д.
                    const match = f.match(/^image(\d*)\.?.*$/);
                    if (match) {
                        const num = match[1] === '' ? 0 : parseInt(match[1], 10);
                        if (num >= imageCount) {
                            imageCount = num + 1;
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Error scanning upload directory:', e);
        }
        
        // Генерируем имя: image, image1, image2 и т.д.
        const baseName = imageCount === 0 ? 'image' : 'image' + imageCount;
        cb(null, baseName + fileExt);
    }
});

const upload = multer({ storage: storage });

// Скачать файл заявки с аудитом
router.get('/:id/files/:fileName(*)', authMiddleware, async (req, res) => {
    try {
        // Проверяем аутентификацию пользователя
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const bidId = parseInt(req.params.id);
        const fileName = req.params.fileName;
        
        const filePath = path.join(__dirname, '..', 'uploads', 'bids', bidId.toString(), fileName);
        
        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Файл не найден' });
        }
        
        // Получаем информацию о файле из базы
        const bidFile = await prisma.bidFile.findFirst({
            where: {
                bidId: bidId,
                filename: fileName,
            },
        });
        
        // Создаём запись в аудит-логе о скачивании файла
        if (bidFile) {
            await prisma.auditLog.create({
                data: {
                    bidId: bidId,
                    userId: req.user.id,
                    action: 'Файл скачан',
                    details: bidFile.originalName,
                },
            });
        }
        
        // Отправляем файл
        const displayName = bidFile ? bidFile.originalName : fileName;
        res.download(filePath, displayName);
    } catch (error) {
        console.error('Download bid file error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получить список файлов заявки
router.get('/:id/files', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        
        // Получаем записи о файлах из базы данных
        const bidFiles = await prisma.bidFile.findMany({
            where: { bidId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        
        // Формируем список файлов с путями
        const fileList = bidFiles.map(bidFile => ({
            id: bidFile.id,
            name: bidFile.filename,
            originalName: bidFile.originalName,
            path: `/uploads/bids/${bidId}/${bidFile.filename}`,
            size: bidFile.fileSize,
            uploadedBy: bidFile.uploadedBy,
            uploaderName: bidFile.user ? bidFile.user.fullName : 'Неизвестный пользователь',
            createdAt: bidFile.createdAt,
        }));
        
        res.json(fileList);
    } catch (error) {
        console.error('Get bid files error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Загрузить файлы к заявке (один или несколько)
router.post('/:id/files', authMiddleware, upload.array('files', 10), async (req, res) => {
    try {
        // Поддерживаем как один файл, так и массив файлов
        const files = req.files;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'Файлы не загружены' });
        }
        
        // Проверяем аутентификацию пользователя
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const bidId = parseInt(req.params.id);
        const uploadedFiles = [];
        
        // Обрабатываем каждый файл
        for (const file of files) {
            let fileSize = file.size;
            let finalFilename = file.filename;
            
            // Если это изображение, сжимаем его
            if (isImageFile(file.mimetype)) {
                const inputPath = file.path;
                const outputPath = inputPath.replace(/(\.[^/.]+)$/, '_compressed$1');
                
                const compressedSize = await compressImage(inputPath, outputPath);
                
                if (compressedSize !== null && compressedSize < file.size) {
                    // Удаляем оригинальный файл
                    fs.unlinkSync(inputPath);
                    // Переименовываем сжатый файл
                    fs.renameSync(outputPath, inputPath);
                    fileSize = compressedSize;
                    console.log(`Изображение сжато: ${file.size} -> ${compressedSize} байт (в ${(file.size / compressedSize).toFixed(2)} раз меньше)`);
                } else {
                    // Если сжатие не удалось или файл стал больше, удаляем сжатую версию
                    if (fs.existsSync(outputPath)) {
                        fs.unlinkSync(outputPath);
                    }
                }
            }
            
            // Создаем запись о файле в базе данных
            const bidFile = await prisma.bidFile.create({
                data: {
                    bidId: bidId,
                    filename: finalFilename,
                    // Сохраняем только системное имя (image, image1 и т.д.) как originalName
                    originalName: finalFilename,
                    fileSize: fileSize,
                    mimeType: file.mimetype,
                    uploadedBy: req.user.id,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                        },
                    },
                },
            });
            
            const fileInfo = {
                id: bidFile.id,
                name: bidFile.filename,
                originalName: bidFile.originalName,
                path: `/uploads/bids/${bidId}/${bidFile.filename}`,
                size: bidFile.fileSize,
                uploadedBy: bidFile.uploadedBy,
                uploaderName: bidFile.user ? bidFile.user.fullName : 'Неизвестный пользователь',
                createdAt: bidFile.createdAt,
            };
            
            uploadedFiles.push(fileInfo);
            console.log('Файл загружен к заявке:', bidId, fileInfo);
            logBidData('Загрузка файла к заявки ID: ' + bidId, fileInfo);
            
            // Создаём запись в аудит-логе
            await prisma.auditLog.create({
                data: {
                    bidId: bidId,
                    userId: req.user.id,
                    action: 'Файл добавлен',
                    details: 'Файл загружен',
                },
            });
        }
        
        // Возвращаем массив загруженных файлов
        res.json(uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles);
    } catch (error) {
        console.error('Upload bid files error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удалить файл заявки
router.delete('/:id/files/:fileName(*)', authMiddleware, async (req, res) => {
    try {
        // Проверяем аутентификацию пользователя
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const bidId = parseInt(req.params.id);
        // Файл уже декодирован на фронтенде, используем как есть
        const fileName = req.params.fileName;
        
        // Получаем информацию о файле перед удалением
        const bidFile = await prisma.bidFile.findFirst({
            where: {
                bidId: bidId,
                filename: fileName,
            },
        });
        
        const filePath = path.join(__dirname, '..', 'uploads', 'bids', bidId.toString(), fileName);
        
        // Пытаемся удалить файл с диска, если он существует
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Удаляем запись из базы данных
        await prisma.bidFile.deleteMany({
            where: {
                bidId: bidId,
                filename: fileName,
            },
        });
        
        console.log('Файл удалён из заявки:', bidId, fileName);
        logBidData('Удаление файла из заявки ID: ' + bidId, { fileName });
        
        // Создаём запись в аудит-логе о удалении файла
        if (bidFile) {
            await prisma.auditLog.create({
                data: {
                    bidId: bidId,
                    userId: req.user.id,
                    action: 'Файл удалён',
                    details: bidFile.originalName,
                },
            });
        }
        
        res.json({ message: 'Файл успешно удалён' });
    } catch (error) {
        console.error('Delete bid file error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Валидация и очистка файлов заявки - удаляет записи о несуществующих файлах
router.post('/:id/files/validate', authMiddleware, async (req, res) => {
    try {
        const bidId = parseInt(req.params.id);
        
        // Получаем все файлы заявки из базы данных
        const bidFiles = await prisma.bidFile.findMany({
            where: { bidId },
        });
        
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'bids', bidId.toString());
        const deletedFiles = [];
        const existingFiles = [];
        
        for (const bidFile of bidFiles) {
            const filePath = path.join(uploadsDir, bidFile.filename);
            
            if (fs.existsSync(filePath)) {
                existingFiles.push({
                    id: bidFile.id,
                    filename: bidFile.filename,
                    originalName: bidFile.originalName,
                });
            } else {
                // Файл не существует на диске, удаляем запись из БД
                await prisma.bidFile.delete({
                    where: { id: bidFile.id },
                });
                deletedFiles.push({
                    id: bidFile.id,
                    filename: bidFile.filename,
                    originalName: bidFile.originalName,
                });
                console.log(`Удалён orphaned файл из БД: ${bidFile.filename} (заявка ${bidId})`);
            }
        }
        
        res.json({
            message: `Проверка завершена: ${existingFiles.length} файлов существует, ${deletedFiles.length} записей удалено`,
            deletedFiles,
            existingFiles,
        });
    } catch (error) {
        console.error('Validate bid files error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Глобальная валидация всех файлов - для всех заявок
router.post('/files/validate-all', authMiddleware, async (req, res) => {
    try {
        // Получаем все файлы из базы данных
        const allBidFiles = await prisma.bidFile.findMany({
            include: {
                bid: {
                    select: { id: true, tema: true },
                },
            },
        });
        
        const uploadsBidsDir = path.join(__dirname, '..', 'uploads', 'bids');
        const results = {
            totalFiles: allBidFiles.length,
            existingFiles: 0,
            deletedFiles: 0,
            errors: [],
            deletedRecords: [],
        };
        
        for (const bidFile of allBidFiles) {
            const filePath = path.join(uploadsBidsDir, bidFile.bidId.toString(), bidFile.filename);
            
            if (fs.existsSync(filePath)) {
                results.existingFiles++;
            } else {
                // Файл не существует на диске, удаляем запись из БД
                try {
                    await prisma.bidFile.delete({
                        where: { id: bidFile.id },
                    });
                    results.deletedFiles++;
                    results.deletedRecords.push({
                        bidId: bidFile.bidId,
                        bidTitle: bidFile.bid?.tema || 'Unknown',
                        filename: bidFile.filename,
                        originalName: bidFile.originalName,
                    });
                    console.log(`Удалён orphaned файл из БД: ${bidFile.filename} (заявка ${bidFile.bidId})`);
                } catch (deleteError) {
                    results.errors.push({
                        fileId: bidFile.id,
                        error: deleteError.message,
                    });
                }
            }
        }
        
        res.json({
            message: `Глобальная проверка завершена: ${results.existingFiles} файлов существует, ${results.deletedFiles} записей удалено`,
            results,
        });
    } catch (error) {
        console.error('Validate all bid files error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;