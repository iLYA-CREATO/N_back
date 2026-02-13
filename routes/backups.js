/**
 * Маршруты управления бэкапами
 *
 * Этот модуль содержит endpoints для создания, просмотра, скачивания
 * и восстановления бэкапов базы данных PostgreSQL.
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const authMiddleware = require('../middleware/auth');

// Настройка multer для загрузки файлов восстановления
const upload = multer({
    dest: 'temp/',
    fileFilter: (req, file, cb) => {
        // Проверяем, что файл имеет расширение .sql или .dump
        if (file.originalname.endsWith('.sql') || file.originalname.endsWith('.dump')) {
            cb(null, true);
        } else {
            cb(new Error('Недопустимый тип файла. Разрешены только .sql и .dump файлы.'));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB лимит
    }
});

// Директория для хранения бэкапов
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Создаем директорию если она не существует
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Функция для парсинга DATABASE_URL
function parseDatabaseUrl(databaseUrl) {
    const url = new URL(databaseUrl);
    return {
        host: url.hostname,
        port: url.port,
        database: url.pathname.slice(1),
        username: url.username,
        password: url.password
    };
}

// Создание бэкапа
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${timestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        // Проверяем доступность pg_dump
        const checkPgDump = `pg_dump --version`;

        exec(checkPgDump, { timeout: 5000 }, (checkError) => {
            if (checkError) {
                // pg_dump не доступен, создаем mock бэкап для тестирования
                console.log('pg_dump не найден, создаем mock бэкап для тестирования');

                const mockBackupContent = `-- Mock backup created at ${new Date().toISOString()}
-- This is a placeholder backup file for testing purposes
-- In production, install PostgreSQL with pg_dump for real backups

-- Database: ${dbConfig.database}
-- Created: ${new Date().toISOString()}

-- Note: This is not a real database backup
-- Install PostgreSQL command-line tools for actual backup functionality
`;

                fs.writeFileSync(filepath, mockBackupContent);

                return res.json({
                    message: 'Mock бэкап успешно создан (для тестирования)',
                    filename: filename,
                    size: fs.statSync(filepath).size,
                    createdAt: new Date().toISOString(),
                    note: 'Это mock бэкап. Установите PostgreSQL с pg_dump для реальных бэкапов'
                });
            }

            // pg_dump доступен, выполняем реальный бэкап
            const pgDumpCommand = `pg_dump --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.username} --dbname=${dbConfig.database} --no-password --format=c --compress=9 --file="${filepath}"`;

            // Устанавливаем пароль в переменную окружения
            const env = { ...process.env, PGPASSWORD: dbConfig.password };

            exec(pgDumpCommand, { env }, (error, stdout, stderr) => {
                if (error) {
                    console.error('Ошибка создания бэкапа:', error);
                    return res.status(500).json({ message: 'Ошибка создания бэкапа', error: error.message });
                }

                if (stderr) {
                    console.log('pg_dump stderr:', stderr);
                }

                res.json({
                    message: 'Бэкап успешно создан',
                    filename: filename,
                    size: fs.statSync(filepath).size,
                    createdAt: new Date().toISOString()
                });
            });
        });

    } catch (error) {
        console.error('Ошибка при создании бэкапа:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера', error: error.message });
    }
});

// Получение списка бэкапов
router.get('/list', authMiddleware, (req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.sql') || file.endsWith('.dump'))
            .map(file => {
                const filepath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filepath);
                return {
                    filename: file,
                    size: stats.size,
                    createdAt: stats.birthtime.toISOString(),
                    modifiedAt: stats.mtime.toISOString()
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ backups: files });
    } catch (error) {
        console.error('Ошибка получения списка бэкапов:', error);
        res.status(500).json({ message: 'Ошибка получения списка бэкапов', error: error.message });
    }
});

// Скачивание бэкапа
router.get('/download/:filename', authMiddleware, (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(BACKUP_DIR, filename);

        // Проверяем существование файла
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Бэкап не найден' });
        }

        // Проверяем расширение файла для безопасности
        if (!filename.endsWith('.sql') && !filename.endsWith('.dump')) {
            return res.status(400).json({ message: 'Недопустимый файл бэкапа' });
        }

        res.download(filepath, filename);
    } catch (error) {
        console.error('Ошибка скачивания бэкапа:', error);
        res.status(500).json({ message: 'Ошибка скачивания бэкапа', error: error.message });
    }
});

// Восстановление из бэкапа
router.post('/restore', authMiddleware, upload.single('backupFile'), async (req, res) => {
    try {
        const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
        let backupPath;

        if (req.file) {
            // Восстановление из загруженного файла
            backupPath = req.file.path;
        } else if (req.body.filename) {
            // Восстановление из существующего бэкапа по имени файла
            const filename = req.body.filename;
            backupPath = path.join(BACKUP_DIR, filename);

            // Проверяем существование файла
            if (!fs.existsSync(backupPath)) {
                return res.status(404).json({ message: 'Бэкап файл не найден' });
            }

            // Проверяем расширение файла для безопасности
            if (!filename.endsWith('.sql') && !filename.endsWith('.dump')) {
                return res.status(400).json({ message: 'Недопустимый файл бэкапа' });
            }
        } else {
            return res.status(400).json({ message: 'Файл бэкапа не предоставлен и имя файла не указано' });
        }

        // Проверяем доступность необходимых инструментов
        const toolCheck = backupPath.endsWith('.sql') ? 'psql --version' : 'pg_restore --version';

        exec(toolCheck, { timeout: 5000 }, (checkError) => {
            if (checkError) {
                console.log(`${backupPath.endsWith('.sql') ? 'psql' : 'pg_restore'} не найден, восстановление невозможно`);
                return res.status(500).json({
                    message: 'Инструменты PostgreSQL не установлены',
                    error: `Для восстановления бэкапа требуется ${backupPath.endsWith('.sql') ? 'psql' : 'pg_restore'}. Установите PostgreSQL с командной строкой.`,
                    details: 'Установите PostgreSQL и добавьте bin директорию в PATH'
                });
            }

            // Определяем команду восстановления в зависимости от типа файла
            let restoreCommand;
            if (backupPath.endsWith('.sql')) {
                // Для SQL файлов используем psql
                restoreCommand = `psql --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.username} --dbname=${dbConfig.database} --no-password --file="${backupPath}"`;
            } else {
                // Для dump файлов используем pg_restore
                restoreCommand = `pg_restore --host=${dbConfig.host} --port=${dbConfig.port} --username=${dbConfig.username} --dbname=${dbConfig.database} --no-password --clean --if-exists --create "${backupPath}"`;
            }

            // Устанавливаем пароль в переменную окружения
            const env = { ...process.env, PGPASSWORD: dbConfig.password };

            exec(restoreCommand, { env }, (error, stdout, stderr) => {
                // Удаляем временный файл только если он был загружен
                if (req.file) {
                    try {
                        fs.unlinkSync(backupPath);
                    } catch (unlinkError) {
                        console.error('Ошибка удаления временного файла:', unlinkError);
                    }
                }

                if (error) {
                    console.error('Ошибка восстановления бэкапа:', error);
                    return res.status(500).json({
                        message: 'Ошибка восстановления бэкапа',
                        error: error.message,
                        stderr: stderr
                    });
                }

                if (stderr) {
                    console.log('Restore stderr:', stderr);
                }

                res.json({
                    message: 'Бэкап успешно восстановлен',
                    restoredAt: new Date().toISOString()
                });
            });
        });

    } catch (error) {
        console.error('Ошибка при восстановлении бэкапа:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера', error: error.message });
    }
});

// Удаление бэкапа
router.delete('/:filename', authMiddleware, (req, res) => {
    try {
        const filename = req.params.filename;
        const filepath = path.join(BACKUP_DIR, filename);

        // Проверяем существование файла
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: 'Бэкап не найден' });
        }

        // Проверяем расширение файла для безопасности
        if (!filename.endsWith('.sql') && !filename.endsWith('.dump')) {
            return res.status(400).json({ message: 'Недопустимый файл бэкапа' });
        }

        fs.unlinkSync(filepath);
        res.json({ message: 'Бэкап успешно удален', filename: filename });

    } catch (error) {
        console.error('Ошибка удаления бэкапа:', error);
        res.status(500).json({ message: 'Ошибка удаления бэкапа', error: error.message });
    }
});

module.exports = router;