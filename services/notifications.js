const { EventEmitter } = require('events');

// Создаем глобальный EventEmitter для уведомлений о новых заявках
const notificationEmitter = new EventEmitter();

// Максимальное количество слушателей (чтобы избежать утечек памяти)
notificationEmitter.setMaxListeners(100);

// Функция для отправки уведомления о новой заявке
function notifyNewBid(bidData) {
    const message = JSON.stringify({
        type: 'NEW_BID',
        data: bidData,
        timestamp: new Date().toISOString()
    });
    
    notificationEmitter.emit('newBid', message);
    console.log('📢 Уведомление о новой заявке создано:', bidData.id);
}

module.exports = { notificationEmitter, notifyNewBid };
