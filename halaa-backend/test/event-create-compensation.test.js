const test = require('node:test');
const assert = require('node:assert/strict');

const Event = require('../models/EventModel');
const Guest = require('../models/GuestModel');
const User = require('../models/UserModel');
const taqnyatTemplates = require('../src/modules/taqnyat-templates/taqnyat-templates.service');
const crud = require('../src/modules/events/events.crud.service');

test('guest insertion failure compensates the already-created event', async () => {
  const originals = {
    eventCreate: Event.create,
    eventDeleteOne: Event.deleteOne,
    guestDeleteMany: Guest.deleteMany,
    userFindById: User.findById,
    assertCompatible: taqnyatTemplates.assertInviteTemplateCompatible,
    createGuestsFromList: crud.createGuestsFromList,
  };
  const calls = { eventDelete: 0, guestDelete: 0 };
  const eventId = '64b000000000000000000001';

  try {
    User.findById = () => ({
      select: async () => ({ accountType: 'personal', name: 'Host' }),
    });
    taqnyatTemplates.assertInviteTemplateCompatible = async () => {};
    Event.create = async () => ({ _id: eventId, guestList: [], save: async () => {} });
    Event.deleteOne = async (filter) => {
      assert.equal(String(filter._id), eventId);
      calls.eventDelete += 1;
    };
    Guest.deleteMany = async (filter) => {
      assert.equal(String(filter.event), eventId);
      calls.guestDelete += 1;
    };
    crud.createGuestsFromList = async () => {
      throw new Error('injected guest write failure');
    };

    const date = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    await assert.rejects(
      () =>
        crud.createEvent(
          {
            eventDetails: { title: 'Compensation', date, time: '18:30' },
            invitationType: 'reply_and_qr',
          },
          [{ name: 'Guest', phone: '966500000001' }],
          {
            userId: '64b000000000000000000002',
            userRole: 'host',
            subscription: null,
            skipSubscriptionCheck: true,
          }
        ),
      /injected guest write failure/
    );

    assert.deepEqual(calls, { eventDelete: 1, guestDelete: 1 });
  } finally {
    Event.create = originals.eventCreate;
    Event.deleteOne = originals.eventDeleteOne;
    Guest.deleteMany = originals.guestDeleteMany;
    User.findById = originals.userFindById;
    taqnyatTemplates.assertInviteTemplateCompatible = originals.assertCompatible;
    crud.createGuestsFromList = originals.createGuestsFromList;
  }
});
