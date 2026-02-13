const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const prisma = require('../prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const equipmentId = req.params.id || 'temp';
        const uploadDir = path.join(__dirname, '../uploads/equipment', equipmentId);
        
        // Создаем директорию, если её нет
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя файла
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Разрешаем только изображения
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Только изображения (jpeg, jpg, png, gif, webp) разрешены!'));
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Get all equipment
router.get('/', authMiddleware, async (req, res) => {
    try {
        const equipment = await prisma.equipment.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Format response
        const formattedEquipment = equipment.map(item => {
            return {
                id: item.id,
                name: item.name,
                productCode: item.productCode,
                sellingPrice: item.sellingPrice ? parseFloat(item.sellingPrice) : null,
                purchasePrice: item.purchasePrice ? parseFloat(item.purchasePrice) : null,
                images: item.images || []
            };
        });

        res.json(formattedEquipment);
    } catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single equipment
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const equipment = await prisma.equipment.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        res.json({
            ...equipment,
            sellingPrice: equipment.sellingPrice ? parseFloat(equipment.sellingPrice) : null,
            purchasePrice: equipment.purchasePrice ? parseFloat(equipment.purchasePrice) : null,
            images: equipment.images || []
        });
    } catch (error) {
        console.error('Get equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create equipment
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, productCode, sellingPrice, purchasePrice } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Название обязательно' });
        }

        // Check for unique name
        const existingName = await prisma.equipment.findFirst({
            where: { name: name }
        });
        if (existingName) {
            return res.status(400).json({ message: 'Оборудование с таким названием уже существует' });
        }

        if (productCode) {
            const existingCode = await prisma.equipment.findFirst({
                where: { productCode: parseInt(productCode) }
            });
            if (existingCode) {
                return res.status(400).json({ message: 'Оборудование с таким кодом товара уже существует' });
            }
        }

        const newEquipment = await prisma.equipment.create({
            data: {
                name,
                productCode: productCode ? parseInt(productCode) : null,
                sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
                purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
                images: []
            }
        });

        res.status(201).json({
            ...newEquipment,
            sellingPrice: newEquipment.sellingPrice ? parseFloat(newEquipment.sellingPrice) : null,
            purchasePrice: newEquipment.purchasePrice ? parseFloat(newEquipment.purchasePrice) : null,
            images: newEquipment.images || []
        });
    } catch (error) {
        console.error('Create equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update equipment
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { name, productCode, sellingPrice, purchasePrice } = req.body;
        const equipmentId = parseInt(req.params.id);

        const currentEquipment = await prisma.equipment.findUnique({
            where: { id: equipmentId }
        });

        if (!currentEquipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        if (name !== undefined && name !== currentEquipment.name) {
            const existingName = await prisma.equipment.findFirst({
                where: { name: name }
            });
            if (existingName) {
                return res.status(400).json({ message: 'Оборудование с таким названием уже существует' });
            }
        }

        if (productCode !== undefined && (productCode ? parseInt(productCode) : null) !== currentEquipment.productCode) {
            if (productCode) {
                const existingCode = await prisma.equipment.findFirst({
                    where: { productCode: parseInt(productCode) }
                });
                if (existingCode) {
                    return res.status(400).json({ message: 'Оборудование с таким кодом товара уже существует' });
                }
            }
        }

        const updatedEquipment = await prisma.equipment.update({
            where: { id: equipmentId },
            data: {
                ...(name !== undefined && { name }),
                ...(productCode !== undefined && { productCode: productCode ? parseInt(productCode) : null }),
                ...(sellingPrice !== undefined && { sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null }),
                ...(purchasePrice !== undefined && { purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null }),
            },
        });

        res.json({
            ...updatedEquipment,
            sellingPrice: updatedEquipment.sellingPrice ? parseFloat(updatedEquipment.sellingPrice) : null,
            purchasePrice: updatedEquipment.purchasePrice ? parseFloat(updatedEquipment.purchasePrice) : null,
            images: updatedEquipment.images || []
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        console.error('Update equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Upload image for equipment
router.post('/:id/images', authMiddleware, upload.array('images', 10), async (req, res) => {
    try {
        const equipmentId = parseInt(req.params.id);
        
        const equipment = await prisma.equipment.findUnique({
            where: { id: equipmentId }
        });

        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Get existing images
        const existingImages = equipment.images || [];
        
        // Get new image filenames
        const newImages = req.files.map(file => file.filename);

        // Combine existing and new images
        const updatedImages = [...existingImages, ...newImages];

        // Update equipment with new images
        const updatedEquipment = await prisma.equipment.update({
            where: { id: equipmentId },
            data: { images: updatedImages }
        });

        res.json({
            message: 'Изображения загружены',
            images: updatedEquipment.images || []
        });
    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete image from equipment
router.delete('/:id/images/:filename', authMiddleware, async (req, res) => {
    try {
        const equipmentId = parseInt(req.params.id);
        const filename = req.params.filename;

        const equipment = await prisma.equipment.findUnique({
            where: { id: equipmentId }
        });

        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        // Get existing images
        const existingImages = equipment.images || [];
        
        // Remove the image from the array
        const updatedImages = existingImages.filter(img => img !== filename);

        // Delete file from filesystem
        const filePath = path.join(__dirname, '../uploads/equipment', equipmentId.toString(), filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Update equipment
        const updatedEquipment = await prisma.equipment.update({
            where: { id: equipmentId },
            data: { images: updatedImages }
        });

        res.json({
            message: 'Изображение удалено',
            images: updatedEquipment.images || []
        });
    } catch (error) {
        console.error('Delete image error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reorder images for equipment
router.put('/:id/images/reorder', authMiddleware, async (req, res) => {
    try {
        const equipmentId = parseInt(req.params.id);
        const { newOrder } = req.body; // Array of filenames in new order

        const equipment = await prisma.equipment.findUnique({
            where: { id: equipmentId }
        });

        if (!equipment) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        const updatedEquipment = await prisma.equipment.update({
            where: { id: equipmentId },
            data: { images: newOrder }
        });

        res.json({
            message: 'Порядок изображений обновлен',
            images: updatedEquipment.images || []
        });
    } catch (error) {
        console.error('Reorder images error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Delete equipment
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const equipmentId = parseInt(req.params.id);
        
        // Check if equipment is being used
        const clientObjects = await prisma.clientObject.findMany({
            where: { equipmentId: equipmentId }
        });
        
        const bidEquipments = await prisma.bidEquipment.findMany({
            where: { equipmentId: equipmentId }
        });
        
        const clientEquipments = await prisma.clientEquipment.findMany({
            where: { equipmentId: equipmentId }
        });
        
        const usageInfo = [];
        if (clientObjects.length > 0) {
            usageInfo.push(`объектов клиентов: ${clientObjects.length}`);
        }
        if (bidEquipments.length > 0) {
            usageInfo.push(`заявок: ${bidEquipments.length}`);
        }
        if (clientEquipments.length > 0) {
            usageInfo.push(`оборудования клиентов: ${clientEquipments.length}`);
        }
        
        if (usageInfo.length > 0) {
            return res.status(400).json({ 
                message: 'Нельзя удалить оборудование, так как оно используется в: ' + usageInfo.join(', ')
            });
        }

        // Delete images folder
        const imagesDir = path.join(__dirname, '../uploads/equipment', equipmentId.toString());
        if (fs.existsSync(imagesDir)) {
            fs.rmSync(imagesDir, { recursive: true, force: true });
        }

        const deletedEquipment = await prisma.equipment.delete({
            where: { id: equipmentId },
        });

        res.json({
            message: 'Equipment deleted',
            equipment: {
                ...deletedEquipment,
                sellingPrice: deletedEquipment.sellingPrice ? parseFloat(deletedEquipment.sellingPrice) : null,
                purchasePrice: deletedEquipment.purchasePrice ? parseFloat(deletedEquipment.purchasePrice) : null,
            },
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Equipment not found' });
        }
        console.error('Delete equipment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
