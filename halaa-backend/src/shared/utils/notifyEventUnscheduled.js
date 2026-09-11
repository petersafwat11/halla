const notifications = require('../../modules/notifications/notifications.service');
const logger = require('./logger');

module.exports = async function notifyEventUnscheduled(event) {
  if (!event?.host) return;
  const title = event.eventDetails?.title || '';
  try {
    await notifications.sendToUser(event.host, {
      type: 'event_unscheduled',
      title: 'Invitation sending needs rescheduling',
      titleAr: 'يلزم إعادة جدولة إرسال الدعوات',
      message: 'The sending schedule for "' + title + '" was cleared because the invitation changed after testing. Send a new test message, then choose and confirm a new sending time. Invitations will not send until you reschedule.',
      messageAr: 'أُلغي موعد إرسال دعوات "' + title + '" لأن الدعوة تغيّرت بعد الاختبار. أرسل رسالة تجريبية جديدة، ثم اختر موعد إرسال جديدًا وأكّده. لن تُرسل الدعوات حتى تعيد الجدولة.',
      data: { entityType: 'event', entityId: event._id },
    });
  } catch (error) {
    logger.error('Could not notify host of cleared invitation schedule', { eventId: String(event._id), message: error.message });
  }
};
