/**
 * Scheduled extra reminder controller.
 * Routes mounted under /events/:id/scheduled-reminders.
 *
 * @module modules/scheduled-extra-reminders/scheduled-extra-reminders.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const service = require('./scheduled-extra-reminders.service');

exports.list = catchAsync(async (req, res) => {
  const reminders = await service.list({
    eventId: req.params.id,
    user: req.user,
  });
  sendSuccess(res, { scheduledReminders: reminders });
});

exports.create = catchAsync(async (req, res) => {
  const scheduled = await service.create({
    eventId: req.params.id,
    body: req.body,
    user: req.user,
  });
  sendSuccess(res, { scheduled }, 'Reminder scheduled');
});

exports.cancel = catchAsync(async (req, res) => {
  const result = await service.cancel({
    eventId: req.params.id,
    reminderId: req.params.rid,
    user: req.user,
  });
  sendSuccess(res, result, 'Reminder cancelled');
});
