const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');


    const adminRole = await prisma.role.upsert({
        where: { name: 'Админ' },
        update: {
            permissions: {
                // Все права для администратора
                user_create: true,
                user_edit: true,
                user_delete: true,
                role_create: true,
                role_edit: true,
                role_delete: true,
                spec_category_create: true,
                spec_category_edit: true,
                spec_category_delete: true,
                spec_create: true,
                spec_edit: true,
                spec_delete: true,
                bid_type_create: true,
                bid_type_edit: true,
                bid_type_delete: true,
                client_create: true,
                client_edit: true,
                client_delete: true,
                bid_create: true,
                bid_edit: true,
                bid_delete: true,
                bid_equipment_add: true,
                tab_warehouse: true,
                tab_salary: true,
                settings_user_button: true,
                settings_role_button: true,
                settings_spec_category_button: true,
                settings_spec_button: true,
                settings_bid_type_button: true,
            },
        },
        create: {
            name: 'Админ',
            description: 'Администратор',
            permissions: {
                // Все права для администратора
                user_create: true,
                user_edit: true,
                user_delete: true,
                role_create: true,
                role_edit: true,
                role_delete: true,
                spec_category_create: true,
                spec_category_edit: true,
                spec_category_delete: true,
                spec_create: true,
                spec_edit: true,
                spec_delete: true,
                bid_type_create: true,
                bid_type_edit: true,
                bid_type_delete: true,
                client_create: true,
                client_edit: true,
                client_delete: true,
                bid_create: true,
                bid_edit: true,
                bid_delete: true,
                bid_equipment_add: true,
                tab_warehouse: true,
                tab_salary: true,
                settings_user_button: true,
                settings_role_button: true,
                settings_spec_category_button: true,
                settings_spec_button: true,
                settings_bid_type_button: true,
            },
        },
    });
    console.log('✅ Created role:', adminRole);

    const managerRole = await prisma.role.upsert({
        where: { name: 'Менеджер' },
        update: {
            permissions: {
                user_create: true,
                user_edit: true,
                user_delete: false,
                spec_category_create: true,
                spec_category_edit: true,
                spec_category_delete: false,
                spec_create: true,
                spec_edit: true,
                spec_delete: false,
                settings_user_button: true,
                settings_spec_category_button: true,
                settings_spec_button: true,
            },
        },
        create: {
            name: 'Менеджер',
            description: 'Менеджер',
            permissions: {
                user_create: true,
                user_edit: true,
                user_delete: false,
                spec_category_create: true,
                spec_category_edit: true,
                spec_category_delete: false,
                spec_create: true,
                spec_edit: true,
                spec_delete: false,
                settings_user_button: true,
                settings_spec_category_button: true,
                settings_spec_button: true,
            },
        },
    });
    console.log('✅ Created role:', managerRole);

    const techSpecialistRole = await prisma.role.upsert({
        where: { name: 'Технический специалист' },
        update: {
            permissions: {
                spec_category_create: true,
                spec_category_edit: true,
                spec_category_delete: false,
                spec_create: true,
                spec_edit: true,
                spec_delete: false,
                bid_type_create: true,
                bid_type_edit: true,
                bid_type_delete: false,
                settings_spec_category_button: true,
                settings_spec_button: true,
                settings_bid_type_button: true,
            },
        },
        create: {
            name: 'Технический специалист',
            description: 'Технический специалист',
            permissions: {
                spec_category_create: true,
                spec_category_edit: true,
                spec_category_delete: false,
                spec_create: true,
                spec_edit: true,
                spec_delete: false,
                bid_type_create: true,
                bid_type_edit: true,
                bid_type_delete: false,
                settings_spec_category_button: true,
                settings_spec_button: true,
                settings_bid_type_button: true,
            },
        },
    });
    console.log('✅ Created role:', techSpecialistRole);

    const accountantRole = await prisma.role.upsert({
        where: { name: 'Бухгалтер' },
        update: {
            permissions: {
                user_create: false,
                user_edit: true,
                user_delete: false,
                role_create: true,
                role_edit: true,
                role_delete: false,
                settings_user_button: true,
                settings_role_button: true,
            },
        },
        create: {
            name: 'Бухгалтер',
            description: 'Бухгалтер',
            permissions: {
                user_create: false,
                user_edit: true,
                user_delete: false,
                role_create: true,
                role_edit: true,
                role_delete: false,
                settings_user_button: true,
                settings_role_button: true,
            },
        },
    });
    console.log('✅ Created role:', accountantRole);

    const installerRole = await prisma.role.upsert({
        where: { name: 'Монтажник' },
        update: {},
        create: {
            name: 'Монтажник',
            description: 'Монтажник',
        },
    });
    console.log('✅ Created role:', installerRole);

    // Склад роль
    const warehouseRole = await prisma.role.upsert({
        where: { name: 'Склад' },
        update: {},
        create: {
            name: 'Склад',
            description: 'Склад',
        },
    });
    console.log('✅ Created role:', warehouseRole);

    // Создание типа заявки "Выдача оборудования без преднастройки и монтажа"
    const defaultBidType = await prisma.bidType.upsert({
        where: { name: 'Стандартная заявка' },
        update: {
            name: 'Выдача оборудования без преднастройки и монтажа',
            description: 'Выдача оборудования без преднастройки и монтажа',
            plannedReactionTimeMinutes: 60,
            plannedDurationMinutes: 1440,
            statuses: [
                { name: 'Открыта', position: 1, allowedActions: ["edit"], color: null, responsibleRoleId: 'Склад' },
                { name: 'Собрать', position: 2, allowedActions: ["edit", "close"], color: '#3b82f6', responsibleUserId: null },
                { name: 'Отложить', position: 3, allowedActions: [], color: '#eab308', responsibleUserId: null },
                { name: 'Закрыта', position: 999, allowedActions: [], color: null }
            ],
            transitions: [
                { fromPosition: 1, toPosition: 2 },
                { fromPosition: 1, toPosition: 3 },
                { fromPosition: 2, toPosition: 3 },
                { fromPosition: 2, toPosition: 999 }
            ]
        },
        create: {
            name: 'Выдача оборудования без преднастройки и монтажа',
            description: 'Выдача оборудования без преднастройки и монтажа',
            plannedReactionTimeMinutes: 60,
            plannedDurationMinutes: 1440,
            statuses: [
                { name: 'Открыта', position: 1, allowedActions: ["edit"], color: null, responsibleRoleId: 'Склад' },
                { name: 'Собрать', position: 2, allowedActions: ["edit", "close"], color: '#3b82f6', responsibleUserId: null },
                { name: 'Отложить', position: 3, allowedActions: [], color: '#eab308', responsibleUserId: null },
                { name: 'Закрыта', position: 999, allowedActions: [], color: null }
            ],
            transitions: [
                { fromPosition: 1, toPosition: 2 },
                { fromPosition: 1, toPosition: 3 },
                { fromPosition: 2, toPosition: 3 },
                { fromPosition: 2, toPosition: 999 }
            ]
        },
    });

    // Хэширование пароля
    const hashedPassword = await bcrypt.hash('123', 10);

    // Создание администратора
    const adminUser = await prisma.user.upsert({
        where: { username: 'Sergei' },
        update: {
            fullName: 'Беляев Сергей',
            password: hashedPassword,
            role: 'Админ',
        },
        create: {
            username: 'Sergei',
            fullName: 'Беляев Сергей',
            email: 'admin@mail.ru',
            password: hashedPassword,
            role: 'Админ',
        },
    });

    // Склад
    const managerDemidov = await prisma.user.upsert({
        where: { username: 'Demidov' },
        update: {
            fullName: 'Демидов Илья',
            password: hashedPassword,
            role: 'Склад',
        },
        create: {
            username: 'Demidov',
            fullName: 'Демидов Илья',
            email: 'Demidov@mail.ru',
            password: hashedPassword,
            role: 'Склад',
        },
    });
    const managerPotapova = await prisma.user.upsert({
        where: { username: 'Potapova' },
        update: {
            fullName: 'Потапова Людмила',
            password: hashedPassword,
            role: 'Склад',
        },
        create: {
            username: 'Potapova',
            fullName: 'Потапова Людмила',
            email: 'Potapova@mail.ru',
            password: hashedPassword,
            role: 'Склад',
        },
    });

    // Менеджеры
    const managerOlga = await prisma.user.upsert({
        where: { username: 'Olga' },
        update: {
            fullName: 'Кречетова Ольга',
            password: hashedPassword,
            role: 'Менеджер',
        },
        create: {
            username: 'Olga',
            fullName: 'Кречетова Ольга',
            email: 'manager1@mail.ru',
            password: hashedPassword,
            role: 'Менеджер',
        },
    });
    const managerNasty = await prisma.user.upsert({
        where: { username: 'Nasty999' },
        update: {
            fullName: 'Горбунова Анастасия',
            password: hashedPassword,
            role: 'Менеджер',
        },
        create: {
            username: 'Nasty999',
            fullName: 'Горбунова Анастасия',
            email: 'manager2@mail.ru',
            password: hashedPassword,
            role: 'Менеджер',
        },
    });
    const managerVV = await prisma.user.upsert({
        where: { username: 'VV' },
        update: {
            fullName: 'Василенко Вадим',
            password: hashedPassword,
            role: 'Менеджер',
        },
        create: {
            username: 'VV',
            fullName: 'Василенко Вадим',
            email: 'manager3@mail.ru',
            password: hashedPassword,
            role: 'Менеджер',
        },
    });
    const managerCV = await prisma.user.upsert({
        where: { username: 'CV' },
        update: {
            fullName: 'Стариков Вадим',
            password: hashedPassword,
            role: 'Менеджер',
        },
        create: {
            username: 'CV',
            fullName: 'Стариков Вадим',
            email: 'starikov@mail.ru',
            password: hashedPassword,
            role: 'Менеджер',
        },
    });
    const managerKV = await prisma.user.upsert({
        where: { username: 'KV' },
        update: {
            fullName: 'Кирилов Владислав',
            password: hashedPassword,
            role: 'Менеджер',
        },
        create: {
            username: 'KV',
            fullName: 'Кирилов Владислав',
            email: 'kirilov@mail.ru',
            password: hashedPassword,
            role: 'Менеджер',
        },
    });
    const managerBaran = await prisma.user.upsert({
        where: { username: 'Baran' },
        update: {
            fullName: 'Баранов Олег',
            password: hashedPassword,
            role: 'Менеджер',
        },
        create: {
            username: 'Baran',
            fullName: 'Баранов Олег',
            email: 'baranov@mail.ru',
            password: hashedPassword,
            role: 'Менеджер',
        },
    });
    
    // Монтажники
    const montagVladik = await prisma.user.upsert({
        where: { username: 'Vladik' },
        update: {
            fullName: 'Евдокимов Владислав',
            password: hashedPassword,
            role: 'Монтажник',
        },
        create: {
            username: 'Vladik',
            fullName: 'Евдокимов Владислав',
            email: 'installer1@mail.ru',
            password: hashedPassword,
            role: 'Монтажник',
        },
    });
    const montagZuev = await prisma.user.upsert({
        where: { username: 'Zuev' },
        update: {
            fullName: 'Зуев Сергей',
            password: hashedPassword,
            role: 'Монтажник',
        },
        create: {
            username: 'Zuev',
            fullName: 'Зуев Сергей',
            email: 'installer2@mail.ru',
            password: hashedPassword,
            role: 'Монтажник',
        },
    });

    // Создание демо-клиентов
    const client1 = await prisma.client.create({
        data: {
            name: 'Уваровская Нива',
            email: 'contact@acme.com',
            phone: '+380501234567',
        },
    });
    console.log('✅ Created client:', client1);

    const client2 = await prisma.client.create({
        data: {
            name: 'Агротехнологии',
            email: 'info@techsolutions.com',
            phone: '+380507654321',
        },
    });
    console.log('✅ Created client:', client2);

    // Создание демо-заявок
    const bid1 = await prisma.bid.create({
        data: {
            clientId: client1.id,
            bidTypeId: defaultBidType.id,
            tema: 'Website Redesign',
            amount: 50000,
            status: 'Открыта',
            description: 'Complete website redesign project',
            createdBy: managerNasty.id,
        },
    });
    console.log('✅ Created bid:', bid1);

    const bid2 = await prisma.bid.create({
        data: {
            clientId: client2.id,
            bidTypeId: defaultBidType.id,
            tema: 'Выдача оборудования',
            amount: 120000,
            status: 'Открыта',
            description: 'Выдача оборудования',
            createdBy: managerOlga.id,
        },
    });
    console.log('✅ Created bid:', bid2);

    // Создание дочерней заявки
    const childBid = await prisma.bid.create({
        data: {
            clientId: client1.id,
            bidTypeId: defaultBidType.id,
            tema: 'Дочерняя заявка - Уточнение деталей',
            amount: 25000,
            status: 'Открыта',
            description: 'Дочерняя заявка для уточнения технических деталей',
            parentId: bid1.id,
            createdBy: adminUser.id,
        },
    });
    console.log('✅ Created child bid:', childBid);

    // Создание демо-объектов клиентов
    const object1 = await prisma.clientObject.create({
        data: {
            clientId: client1.id,
            brandModel: 'Toyota Camry',
            stateNumber: 'AA1234BB',
            equipmentId: null,
        },
    });
    console.log('✅ Created client object:', object1);

    const object2 = await prisma.clientObject.create({
        data: {
            clientId: client1.id,
            brandModel: 'Honda Civic',
            stateNumber: 'CC5678DD',
            equipmentId: null,
        },
    });
    console.log('✅ Created client object:', object2);

    // Связывание объектов с заявками
    await prisma.bid.update({
        where: { id: bid1.id },
        data: {
            clientObjectId: object1.id,
        },
    });

    // Создание категорий спецификаций
    const categories = [
        'Автопилот',
        'АРМ',
        'Навигация',
        'Прочее',
        'Тахография',
        'Технический отдел'
    ];

    for (const categoryName of categories) {
        await prisma.specificationCategory.create({
            data: {
                name: categoryName,
            },
        });
        console.log('✅ Created specification category:', categoryName);
    }

    // Получение категории тахографов
    const tachographCategory = await prisma.specificationCategory.findFirst({
        where: { name: 'Тахография' }
    });

    // Create tachograph specifications
    const tachographSpecs = [
        { name: 'Демонтаж/Монтаж/Калибровка тахографа', cost: 550 },
        { name: 'Демонтаж тахографа', cost: 110 },
        { name: 'Диагностика спидометра, Д/С', cost: 220 },
        { name: 'Диагностика тахографа', cost: 220 },
        { name: 'Замена байонетной фишки', cost: 330 },
        { name: 'Замена д/с', cost: 400 },
        { name: 'Замена спидометра', cost: 300 },
        { name: 'Замена фишки А/В', cost: 150 },
        { name: 'Замена фишки Д/С', cost: 330 },
        { name: 'Исправление неполадок спидометра, Д/С', cost: 330 },
        { name: 'Калибровка тахографа', cost: 330 },
        { name: 'Корректировка пробега', cost: 100 },
        { name: 'Монтаж тахографа', cost: 110 },
        { name: 'Настройка тахографа', cost: 110 },
        { name: 'Прошивка тахографа', cost: 110 },
        { name: 'Ремонт проводки', cost: 440 },
        { name: 'Связь с датчиком (VDO - Kitas)', cost: 150 },
        { name: 'Установка Д/С', cost: 300 },
        { name: 'Установка сигнальной проводки', cost: 440 },
        { name: 'Установка сигнальной проводки ИНО', cost: 1100 },
        { name: 'Установка спидометра', cost: 330 },
        { name: 'Установка тахографа', cost: 770 },
        { name: 'Установка тахографа вместо VDO', cost: 550 },
        { name: 'Установка тахографа с подготовкой', cost: 550 },
    ];

    for (const spec of tachographSpecs) {
        await prisma.specification.create({
            data: {
                categoryId: tachographCategory.id,
                name: spec.name,
                cost: spec.cost,
                discount: 0,
            },
        });
        console.log('✅ Created specification:', spec.name);
    }
// Create tachograph specifications
    const armSpecs = [
        { name: 'Автивация тахографа', cost: 60 },
        { name: 'Замена блока НКМ', cost: 60 },
        { name: 'Прошивка ТЦА и ФДО', cost: 100 },
        { name: 'Разблокировка карты водителя', cost: 100 },
        { name: 'Ремонт и пайка явно оторвавшихся частей', cost: 200 },
        { name: 'Чистка карты водителя', cost: 50 },
    ];

    // Получение категории АРМ
    const armCategory = await prisma.specificationCategory.findFirst({
        where: { name: 'АРМ' }
    });

    for (const spec of armSpecs) {
        await prisma.specification.create({
            data: {
                categoryId: armCategory.id,
                name: spec.name,
                cost: spec.cost,
                discount: 0,
            },
        });
        console.log('✅ Created specification:', spec.name);
    }

    // Добавление новой спецификации в категорию АРМ
    await prisma.specification.create({
        data: {
            categoryId: armCategory.id,
            name: 'Замена комплектующих',
            cost: 0, // Стоимость нужно будет установить позже
            discount: 0,
        },
    });
    console.log('✅ Created specification: Замена комплектующих');

    // Get the prochee category
    const procheeCategory = await prisma.specificationCategory.findFirst({
        where: { name: 'Прочее' }
    });

    // Create prochee specifications
    const procheeSpecs = [
        { name: 'Диагностика проводки', cost: 220 },
        { name: 'Дорога 1км', cost: 1.50 },
        { name: 'Замена антенн', cost: 220 },
        { name: 'Замена держака предохранителя', cost: 200 },
        { name: 'Замена клемм-колец', cost: 200 },
        { name: 'Замена предохранителя', cost: 100 },
        { name: 'Комплект видеонаблюдения', cost: 1900 },
        { name: 'Монтаж видеокамеры', cost: 400 },
        { name: 'Монтаж видеокамеры + 10м провода', cost: 1000 },
        { name: 'Монтаж видеокамеры + 5м провода', cost: 600 },
        { name: 'Монтаж видеорегистатора', cost: 500 },
        { name: 'Монтаж кожуха ГВАБ', cost: 350 },
        { name: 'Монтаж кронштейна СИО', cost: 200 },
        { name: 'Монтаж НК 19', cost: 300 },
        { name: 'Монтаж проблескового маяка', cost: 800 },
        { name: 'Монтаж розетки на полуприцеп', cost: 1000 },
        { name: 'Перепломбировка', cost: 150 },
        { name: 'Переработка в выходной', cost: 400 },
        { name: 'Повышающий коэф.', cost: 1000 },
        { name: 'Разборка/Сборка приборных панелей', cost: 550 },
        { name: 'Ремонт проводки', cost: 450 },
        { name: 'Сборка/Пайка проводки ADM под прикуриватель', cost: 100 },
        { name: 'Установка ГВАБ', cost: 1100 },
        { name: 'Установка ГВАБ ИНО', cost: 1650 },
        { name: 'Установка курсоуказателя', cost: 500 },
        { name: 'Установка рации', cost: 1300 },
        { name: 'Установка УОС', cost: 850 },
        { name: 'Установка УОС + клапан', cost: 1000 },
    ];

    for (const spec of procheeSpecs) {
        await prisma.specification.create({
            data: {
                categoryId: procheeCategory.id,
                name: spec.name,
                cost: spec.cost,
                discount: 0,
            },
        });
        console.log('✅ Created specification:', spec.name);
    }

    // Добавление новой спецификации "Нагрузка на ось" в категорию Прочее
    await prisma.specification.create({
        data: {
            categoryId: procheeCategory.id,
            name: 'Нагрузка на ось',
            cost: 0, // Стоимость нужно будет установить позже
            discount: 0,
        },
    });
    console.log('✅ Created specification: Нагрузка на ось');

    // Create demo equipment
    const equipmentList = [
        // Termainal Navtelecom
        { name: 'Smart-2430', productCode: 2430 },
        { name: 'Smart-2435', productCode: 2435 },
        { name: 'Smart-2421', productCode: 2421 },
        { name: 'Smart-2411', productCode: 2411 },
        { name: 'Smart-2413', productCode: 2413 },
        { name: 'Smart-2423', productCode: 2423 },
        { name: 'Smart-2412', productCode: 2412 },
        { name: 'Smart-2425', productCode: 2425 },
        { name: 'Smart-2433', productCode: 2433 },

        // Tachograf
        { name: 'Тахограф Меркурий ТА-001', productCode: 1 },
        { name: 'Тахограф ШТРИХ Taxo RUS', productCode: 2 },
        { name: 'Тахограф ШТРИХ без НКМ', productCode: 3 },
        { name: 'Тахограф Атол Drive X', productCode: 4 },
        { name: 'Тахограф Атол Drive 5', productCode: 5 },
        { name: 'Тахограф Атол Drive Smart', productCode: 6 },
        { name: 'Тахограф VDO 3283', productCode: 7 },
        { name: 'Тахограф ТЦА-02HK', productCode: 8 },
        { name: 'Тахограф DT-20M', productCode: 9 }, // КАСБИ
        { name: 'Микас', productCode: 10 }, // НПП ИТЭЛМА
    ];

    const createdEquipment = [];
    for (const equipment of equipmentList) {
        const eq = await prisma.equipment.upsert({
            where: { name: equipment.name },
            update: {},
            create: {
                name: equipment.name,
                productCode: equipment.productCode,
            },
        });
        createdEquipment.push(eq);
        console.log('✅ Created equipment:', equipment.name, 'with product code:', equipment.productCode);
    }


    console.log('🎉 Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });