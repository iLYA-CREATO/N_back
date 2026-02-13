/**
 * Маршруты аутентификации
 *
 * Этот модуль содержит endpoints для входа в систему, регистрации
 * и получения информации о текущем пользователе.
 */

// Импорт Express для создания маршрутов
const express = require('express');
const router = express.Router();
// Импорт JWT для создания токенов
const jwt = require('jsonwebtoken');
// Импорт bcrypt для хеширования паролей
const bcrypt = require('bcryptjs');
// Импорт Prisma клиента
const prisma = require('../prisma/client');

// Вход в систему
router.post('/login', async (req, res) => {
    try {
        // Извлечение данных из тела запроса
        const { username, password } = req.body;

        // Поиск пользователя в базе данных по username
        const user = await prisma.user.findUnique({
            where: { username },
        });

        // Если пользователь не найден
        if (!user) {
            return res.status(400).json({ message: 'Неверные учетные данные' });
        }

        // Проверка пароля с помощью bcrypt
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Создание JWT токена (действителен 24 часа)
        const token = jwt.sign(
            { id: user.id, username: user.username }, // Payload токена
            process.env.JWT_SECRET, // Секретный ключ из переменных окружения
            { expiresIn: '24h' } // Время жизни токена
        );

        // Получаем роль пользователя с permissions
        const userRole = await prisma.role.findFirst({
            where: { name: user.role },
        });

        // Отправка успешного ответа с токеном и данными пользователя
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                permissions: userRole?.permissions || {},
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
    try {
        // Извлечение данных из тела запроса
        const { username, password, email } = req.body;

        // Проверка существования пользователя с таким же username или email
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email }], // Проверка по username ИЛИ email
            },
        });

        // Если пользователь уже существует
        if (existingUser) {
            return res.status(400).json({
                message: existingUser.username === username
                    ? 'Имя пользователя уже существует' // Конфликт по username
                    : 'Email уже существует' // Конфликт по email
            });
        }

        // Хеширование пароля с солью (10 раундов)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Создание нового пользователя в базе данных
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword, // Сохраняем хешированный пароль
                email,
            },
        });

        // Создание JWT токена для нового пользователя
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Отправка успешного ответа с токеном и данными пользователя
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Получение данных текущего пользователя
router.get('/me', async (req, res) => {
    try {
        // Извлечение токена из заголовка Authorization (формат: "Bearer <token>")
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' }); // Токен не предоставлен
        }

        // Верификация и декодирование JWT токена
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Поиск пользователя в базе данных по ID из токена
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });

        // Если пользователь не найден (удален после выдачи токена)
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Получаем роль пользователя с permissions
        const userRole = await prisma.role.findFirst({
            where: { name: user.role },
        });

        // Отправка данных пользователя (без пароля)
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                permissions: userRole?.permissions || {},
            },
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

module.exports = router;