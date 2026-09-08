const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Event = require('../models/EventModel');
const { createEventSchema, updateEventDetailsSchema } = require('../src/modules/events/events.validation');
const { EVENT_CATEGORY_VALUES } = require('../src/shared/constants');
const schema = Event.schema.path('eventDetails').schema.path('location').schema;
const Location = mongoose.model('AzureLocationValidationTest', schema);
const location = { address: 'Jeddah Hilton, Jeddah', latitude: 21.603542, longitude: 39.109055, city: 'Jeddah', country: 'Saudi Arabia', placeId: 'azure-poi-1', provider: 'azure' };

test('Azure selections pass create/update request validation and persisted location validation', async () => {
  const create = createEventSchema.parse({ eventDetails: { title: 'Test', type: EVENT_CATEGORY_VALUES[0], date: '2026-10-01', time: '18:00', location } });
  assert.equal(create.eventDetails.location.provider, 'azure');
  assert.equal(updateEventDetailsSchema.parse({ location }).location.provider, 'azure');
  assert.equal(new Location(location).validateSync(), undefined);
  const { locationSchema } = await import('../../shared/src/schemas/events.js');
  assert.deepEqual(locationSchema().parse(location), location);
});
test('manual addresses can persist without coordinates, while mapped locations require valid coordinates', () => {
  assert.equal(new Location({ address: 'Owner-provided venue', latitude: null, longitude: null, provider: 'manual' }).validateSync(), undefined);
  assert.ok(new Location({ ...location, latitude: null }).validateSync());
  assert.ok(new Location({ ...location, longitude: 181 }).validateSync());
  assert.ok(new Location({ ...location, provider: 'unknown' }).validateSync());
  assert.ok(new Location({ ...location, provider: 'manual', latitude: null }).validateSync());
});
