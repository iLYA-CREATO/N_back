/**
 * Маршруты для работы с договорами (Contracts)
 * 
 * Этот модуль содержит API endpoints для получения и создания договоров.
 * Договоры связаны с заявками (Bids).
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');

// Функция генерации номера договора
function generateContractNumber(bidId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // Формат: Д-{bidId}-{year}{month}-{random}
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `Д-${bidId}-${year}${month}-${random}`;
}

// Получить все договоры
router.get('/', authMiddleware, async (req, res) => {
    try {
        console.log('Getting all contracts');
        
        // Параметры пагинации
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const take = limit;
        
        // Параметры поиска
        const search = req.query.search || '';
        
        // Параметры фильтрации
        const clientId = req.query.client || '';
        const responsibleId = req.query.responsible || '';
        const clientObjectId = req.query.clientObject || '';
        const equipment = req.query.equipment || '';
        
        // Параметры сортировки
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
        
        // Фильтр: только договоры, связанные с оборудованием заявки
        const whereClause = {
            bidEquipmentId: {
                not: null,
            },
        };
        
        // Добавляем фильтры
        // Для этого нам нужно присоединить bid через bidEquipment
        // Сначала соберём ID заявок, соответствующих фильтрам
        let bidIds = null;
        
        if (clientId || responsibleId || clientObjectId || search) {
            const bidWhere = {};
            if (clientId) bidWhere.clientId = parseInt(clientId);
            if (responsibleId) bidWhere.currentResponsibleUserId = parseInt(responsibleId);
            if (clientObjectId) bidWhere.clientObjectId = parseInt(clientObjectId);
            if (search) {
                bidWhere.OR = [
                    {
                        client: {
                            name: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                    },
                    {
                        clientObject: {
                            OR: [
                                { brandModel: { contains: search, mode: 'insensitive' } },
                                { stateNumber: { contains: search, mode: 'insensitive' } },
                            ],
                        },
                    },
                ];
            }
            
            const matchingBids = await prisma.bid.findMany({
                where: bidWhere,
                select: { id: true }
            });
            bidIds = matchingBids.map(b => b.id);
            
            if (bidIds.length === 0) {
                return res.json({
                    data: [],
                    pagination: { total: 0, page, limit, totalPages: 0 }
                });
            }
        }
        
        if (bidIds) {
            whereClause.bid = {
                id: { in: bidIds }
            };
        }
        
        // Определяем поле для сортировки
        let orderBy = {};
        switch (sortBy) {
            case 'id':
                orderBy = { id: sortOrder };
                break;
            case 'clientName':
                orderBy = { bid: { client: { name: sortOrder } } };
                break;
            case 'responsibleName':
                orderBy = { bid: { currentResponsible: { fullName: sortOrder } } };
                break;
            case 'clientObject':
                orderBy = { bid: { clientObject: { brandModel: sortOrder } } };
                break;
            case 'contractEndDate':
                orderBy = { contractEndDate: sortOrder };
                break;
            default:
                orderBy = { createdAt: sortOrder };
        }
        
        // Получаем общее количество договоров
        const totalCount = await prisma.contract.count({
            where: whereClause,
        });
        
        // Получаем договоры с пагинацией и сортировкой
        const contracts = await prisma.contract.findMany({
            where: whereClause,
            orderBy: orderBy,
            skip: skip,
            take: take,
            include: {
                bid: {
                    select: {
                        id: true,
                        contract: true,
                        client: {
                            select: { id: true, name: true }
                        },
                        clientObject: {
                            select: {
                                id: true,
                                brandModel: true,
                                stateNumber: true,
                                region: true,
                            }
                        },
                        currentResponsible: {
                            select: { id: true, fullName: true }
                        },
                        plannedResolutionDate: true,
                        createdAt: true,
                    }
                },
                bidEquipment: {
                    include: {
                        equipment: {
                            select: { id: true, name: true }
                        }
                    }
                }
            },
        });
        
        // Форматируем ответ для фронтенда - каждый equipment как отдельная строка
        const formattedContracts = contracts.map(contract => {
            // Безопасный парсинг clientObject (может быть уже строкой или JSON)
            let clientObjectData = null;
            if (contract.clientObject) {
                try {
                    clientObjectData = typeof contract.clientObject === 'string' 
                        ? JSON.parse(contract.clientObject) 
                        : contract.clientObject;
                } catch (e) {
                    // Если парсинг не удался, это просто строка - не JSON
                    clientObjectData = null;
                }
            }
            
            return {
                id: contract.id,
                contractNumber: contract.contractNumber || contract.bid?.contract || '-',
                clientName: contract.clientName || (contract.bid?.client?.name || 'Клиент не найден'),
                responsibleName: contract.responsibleName || (contract.bid?.currentResponsible?.fullName || '-'),
                clientObject: clientObjectData || (contract.bid?.clientObject ? {
                    id: contract.bid.clientObject.id,
                    brandModel: contract.bid.clientObject.brandModel,
                    stateNumber: contract.bid.clientObject.stateNumber,
                    region: contract.bid.clientObject.region,
                } : null),
                equipmentName: contract.equipmentName || (contract.bidEquipment?.equipment?.name || '-'),
                imei: contract.imei || (contract.bidEquipment?.imei || '-'),
                quantity: contract.quantity || (contract.bidEquipment?.quantity || '-'),
                contractEndDate: contract.contractEndDate || contract.bid?.plannedResolutionDate,
                createdAt: contract.createdAt,
                bidId: contract.bid?.id,
            };
        });
        
        // Если выбран фильтр по оборудованию, фильтруем на уровне JS
        let filteredContracts = formattedContracts;
        if (equipment) {
            const equipmentLower = equipment.toLowerCase();
            filteredContracts = formattedContracts.filter(c => 
                c.equipmentName.toLowerCase().includes(equipmentLower)
            );
        }
        
        res.json({
            data: filteredContracts,
            pagination: {
                total: totalCount,
                page: page,
                limit: limit,
                totalPages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error('Get contracts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Получить все договоры по ID заявки
router.get('/bid/:bidId', authMiddleware, async (req, res) => {
    try {
        const { bidId } = req.params;
        
        const contracts = await prisma.contract.findMany({
            where: { bidId: parseInt(bidId) },
            include: {
                bidEquipment: true
            }
        });
        
        res.json({ data: contracts });
    } catch (error) {
        console.error('Get contracts by bid ID error:', error);
        // Return empty array if table doesn't exist
        res.json({ data: [] });
    }
});

// Создать или обновить договор
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { 
            bidId, 
            bidEquipmentId,
            contractNumber: providedContractNumber, 
            clientName, 
            responsibleName, 
            clientObject, 
            equipmentName, 
            imei, 
            quantity, 
            contractEndDate 
        } = req.body;
        
        // Автогенерация номера договора если не предоставлен
        const contractNumber = providedContractNumber || generateContractNumber(bidId);
        
        // Создаем новый договор
        const contract = await prisma.contract.create({
            data: {
                bidId: parseInt(bidId),
                bidEquipmentId: bidEquipmentId ? parseInt(bidEquipmentId) : null,
                contractNumber,
                clientName,
                responsibleName,
                clientObject,
                equipmentName,
                imei,
                quantity,
                contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
            },
        });
        
        // Обновляем связь bidEquipment с договором если указан bidEquipmentId
        if (bidEquipmentId) {
            await prisma.bidEquipment.update({
                where: { id: parseInt(bidEquipmentId) },
                data: { },
            });
        }
        
        // Также обновляем поле contract в заявке (последний созданный договор)
        await prisma.bid.update({
            where: { id: parseInt(bidId) },
            data: { contract: contractNumber },
        });
        
        res.json({ data: contract });
    } catch (error) {
        console.error('Create/update contract error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Удалить договор
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        await prisma.contract.delete({
            where: { id: parseInt(id) },
        });
        
        res.json({ message: 'Contract deleted successfully' });
    } catch (error) {
        console.error('Delete contract error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Обновить договор по ID
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            contractNumber, 
            clientName, 
            responsibleName, 
            clientObject, 
            equipmentName, 
            imei, 
            quantity, 
            contractEndDate 
        } = req.body;
        
        const contract = await prisma.contract.update({
            where: { id: parseInt(id) },
            data: {
                contractNumber,
                clientName,
                responsibleName,
                clientObject,
                equipmentName,
                imei,
                quantity,
                contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
            },
        });
        
        res.json({ data: contract });
    } catch (error) {
        console.error('Update contract error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
