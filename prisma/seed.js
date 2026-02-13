const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // 1. Subject Forms
    const subjectForms = ['ИП', 'ООО', 'АО', 'Физлицо'];
    for (const name of subjectForms) {
        await prisma.subjectForm.upsert({
            where: { name },
            update: {},
            create: { name }
        });
    }
    console.log('✅ Created subject forms');

    // 2. Roles
    const roles = [
        {
            name: 'Админ',
            description: 'Администратор',
            permissions: {
                user_create: true, user_edit: true, user_delete: true,
                role_create: true, role_edit: true, role_delete: true,
                spec_category_create: true, spec_category_edit: true, spec_category_delete: true,
                spec_create: true, spec_edit: true, spec_delete: true,
                bid_type_create: true, bid_type_edit: true, bid_type_delete: true,
                client_create: true, client_edit: true, client_delete: true,
                bid_create: true, bid_edit: true, bid_delete: true,
                bid_equipment_add: true, tab_warehouse: true, tab_salary: true,
                settings_user_button: true, settings_role_button: true,
                settings_spec_category_button: true, settings_spec_button: true,
                settings_bid_type_button: true,
            }
        },
        {
            name: 'Менеджер',
            description: 'Менеджер',
            permissions: {
                user_create: true, user_edit: true, user_delete: false,
                spec_category_create: true, spec_category_edit: true, spec_category_delete: false,
                spec_create: true, spec_edit: true, spec_delete: false,
                settings_user_button: true, settings_spec_category_button: true, settings_spec_button: true,
                client_create: true, client_edit: true, client_delete: false,
                bid_create: true, bid_edit: true, bid_delete: false,
            }
        },
        {
            name: 'Технический специалист',
            description: 'Технический специалист',
            permissions: {
                spec_category_create: true, spec_category_edit: true, spec_category_delete: false,
                spec_create: true, spec_edit: true, spec_delete: false,
                bid_type_create: true, bid_type_edit: true, bid_type_delete: false,
                settings_spec_category_button: true, settings_spec_button: true, settings_bid_type_button: true,
            }
        },
        {
            name: 'Бухгалтер',
            description: 'Бухгалтер',
            permissions: {
                user_create: false, user_edit: true, user_delete: false,
                role_create: true, role_edit: true, role_delete: false,
                settings_user_button: true, settings_role_button: true,
            }
        },
        {
            name: 'Монтажник',
            description: 'Монтажник',
            permissions: {}
        },
        {
            name: 'Склад',
            description: 'Склад',
            permissions: {
                tab_warehouse: true,
            }
        }
    ];

    for (const role of roles) {
        const r = await prisma.role.upsert({
            where: { name: role.name },
            update: {
                description: role.description,
                permissions: role.permissions,
            },
            create: {
                name: role.name,
                description: role.description,
                permissions: role.permissions,
            },
        });
        console.log('✅ Created/Updated role:', r.name);
    }

    // 3. Bid Type
    const bidTypeName = 'Выдача оборудования без преднастройки и монтажа';
    // Check if old name exists to migrate it
    const oldType = await prisma.bidType.findUnique({ where: { name: 'Стандартная заявка' } });
    if (oldType) {
        await prisma.bidType.update({
            where: { id: oldType.id },
            data: { name: bidTypeName }
        });
    }

    const defaultBidType = await prisma.bidType.upsert({
        where: { name: bidTypeName },
        update: {
            description: bidTypeName,
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
            name: bidTypeName,
            description: bidTypeName,
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
    console.log('✅ Created/Updated bid type');

    // 4. Users
    const hashedPassword = await bcrypt.hash('123', 10);
    const users = [
        { username: 'Sergei', fullName: 'Беляев Сергей', email: 'admin@mail.ru', role: 'Админ' },
        { username: 'Demidov', fullName: 'Демидов Илья', email: 'Demidov@mail.ru', role: 'Склад' },
        { username: 'Potapova', fullName: 'Потапова Людмила', email: 'Potapova@mail.ru', role: 'Склад' },
        { username: 'Olga', fullName: 'Кречетова Ольга', email: 'manager1@mail.ru', role: 'Менеджер' },
        { username: 'Nasty999', fullName: 'Горбунова Анастасия', email: 'manager2@mail.ru', role: 'Менеджер' },
        { username: 'VV', fullName: 'Василенко Вадим', email: 'manager3@mail.ru', role: 'Менеджер' },
        { username: 'CV', fullName: 'Стариков Вадим', email: 'starikov@mail.ru', role: 'Менеджер' },
        { username: 'KV', fullName: 'Кирилов Владислав', email: 'kirilov@mail.ru', role: 'Менеджер' },
        { username: 'Baran', fullName: 'Баранов Олег', email: 'baranov@mail.ru', role: 'Менеджер' },
        { username: 'Vladik', fullName: 'Евдокимов Владислав', email: 'installer1@mail.ru', role: 'Монтажник' },
        { username: 'Zuev', fullName: 'Зуев Сергей', email: 'installer2@mail.ru', role: 'Монтажник' },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: { username: user.username },
            update: { fullName: user.fullName, role: user.role },
            create: {
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                password: hashedPassword,
                role: user.role,
            },
        });
    }
    console.log('✅ Created/Updated users');

    // 5. Equipment
    const equipmentList = [
        { name: 'Smart-2430', productCode: 2430 },
        { name: 'Smart-2435', productCode: 2435 },
        { name: 'Smart-2421', productCode: 2421 },
        { name: 'Smart-2411', productCode: 2411 },
        { name: 'Smart-2413', productCode: 2413 },
        { name: 'Smart-2423', productCode: 2423 },
        { name: 'Smart-2412', productCode: 2412 },
        { name: 'Smart-2425', productCode: 2425 },
        { name: 'Smart-2433', productCode: 2433 },
        { name: 'Тахограф Меркурий ТА-001', productCode: 1 },
        { name: 'Тахограф ШТРИХ Taxo RUS', productCode: 2 },
        { name: 'Тахограф ШТРИХ без НКМ', productCode: 3 },
        { name: 'Тахограф Атол Drive X', productCode: 4 },
        { name: 'Тахограф Атол Drive 5', productCode: 5 },
        { name: 'Тахограф Атол Drive Smart', productCode: 6 },
        { name: 'Тахограф VDO 3283', productCode: 7 },
        { name: 'Тахограф ТЦА-02HK', productCode: 8 },
        { name: 'Тахограф DT-20M', productCode: 9 },
        { name: 'Микас', productCode: 10 },
    ];

    for (const eq of equipmentList) {
        await prisma.equipment.upsert({
            where: { name: eq.name },
            update: { productCode: eq.productCode },
            create: { name: eq.name, productCode: eq.productCode },
        });
    }
    console.log('✅ Created/Updated equipment');

    // 6. Specification Categories
    const categories = ['Автопилот', 'АРМ', 'Навигация', 'Прочее', 'Тахография', 'Технический отдел'];
    const categoryMap = {};
    for (const name of categories) {
        const cat = await prisma.specificationCategory.upsert({
            where: { id: (await prisma.specificationCategory.findFirst({ where: { name } }))?.id || 0 },
            update: {},
            create: { name }
        });
        categoryMap[name] = cat.id;
    }
    console.log('✅ Created specification categories');

    // 7. Specifications
    const allSpecs = [
        { cat: 'Тахография', name: 'Демонтаж/Монтаж/Калибровка тахографа', cost: 550 },
        { cat: 'Тахография', name: 'Демонтаж тахографа', cost: 110 },
        { cat: 'Тахография', name: 'Диагностика спидометра, Д/С', cost: 220 },
        { cat: 'Тахография', name: 'Диагностика тахографа', cost: 220 },
        { cat: 'АРМ', name: 'Автивация тахографа', cost: 60 },
        { cat: 'АРМ', name: 'Замена блока НКМ', cost: 60 },
        { cat: 'АРМ', name: 'Замена комплектующих', cost: 0 },
        { cat: 'Прочее', name: 'Диагностика проводки', cost: 220 },
        { cat: 'Прочее', name: 'Дорога 1км', cost: 1.50 },
        { cat: 'Прочее', name: 'Нагрузка на ось', cost: 0 },
    ];

    for (const s of allSpecs) {
        const existingSpec = await prisma.specification.findFirst({
            where: { name: s.name, categoryId: categoryMap[s.cat] }
        });
        if (existingSpec) {
            await prisma.specification.update({
                where: { id: existingSpec.id },
                data: { cost: s.cost }
            });
        } else {
            await prisma.specification.create({
                data: { name: s.name, cost: s.cost, categoryId: categoryMap[s.cat], discount: 0 }
            });
        }
    }
    console.log('✅ Created/Updated specifications');

    // 8. Demo Data (Conditional)
    const clientCount = await prisma.client.count();
    if (clientCount === 0) {
        const c1 = await prisma.client.create({
            data: { name: 'Уваровская Нива', email: 'contact@acme.com', phone: '+380501234567', subjectForm: 'ООО' }
        });
        const c2 = await prisma.client.create({
            data: { name: 'Агротехнологии', email: 'info@techsolutions.com', phone: '+380507654321', subjectForm: 'ИП' }
        });

        const mNasty = await prisma.user.findUnique({ where: { username: 'Nasty999' } });
        const mOlga = await prisma.user.findUnique({ where: { username: 'Olga' } });

        const b1 = await prisma.bid.create({
            data: {
                clientId: c1.id, bidTypeId: defaultBidType.id, tema: 'Website Redesign',
                amount: 50000, status: 'Открыта', description: 'Complete project', createdBy: mNasty.id
            }
        });
        await prisma.bid.create({
            data: {
                clientId: c2.id, bidTypeId: defaultBidType.id, tema: 'Выдача оборудования',
                amount: 120000, status: 'Открыта', description: 'Equipment issue', createdBy: mOlga.id
            }
        });

        const o1 = await prisma.clientObject.create({
            data: { clientId: c1.id, brandModel: 'Toyota Camry', stateNumber: 'AA1234BB' }
        });
        await prisma.bid.update({ where: { id: b1.id }, data: { clientObjectId: o1.id } });
        
        console.log('✅ Created demo clients, bids and objects');
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
