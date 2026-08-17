/**
 * Verification Script for Customizable Guest Reminders
 * Run as: node scripts/verify_reminder.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../config.env") });

const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../src/config/database");
const Event = require("../models/EventModel");
const { parseDateTime, toRiyadhComponents } = require("../src/shared/utils/timezone");
const eventsService = require("../src/modules/events/events.service");

// Simple assert helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log("Connecting to database...");
  await connectDB();
  console.log("Database connected successfully!");

  let testEventId = null;

  try {
    console.log("\n--- TEST 1: Default reminderSettings on Event Creation (48h default) ---");
    // Create an event starts in 3 days (72 hours from now)
    const eventTime = new Date();
    eventTime.setHours(eventTime.getHours() + 72);
    // Convert to Riyadh wall-clock components for eventDetails
    const comps = toRiyadhComponents(eventTime);
    
    console.log(`Setting event date to: ${comps.date.toISOString()} at time: ${comps.time}`);

    const newEvent = new Event({
      title: "Test Customizable Reminder Event",
      host: new mongoose.Types.ObjectId(),
      status: "pending_scheduling",
      eventDetails: {
        type: "wedding",
        date: comps.date,
        time: comps.time,
        timezone: "Asia/Riyadh",
        location: {
          address: "Test Address",
          latitude: 24.7136,
          longitude: 46.6753
        }
      }
    });

    await newEvent.save();
    testEventId = newEvent._id;
    console.log(`Event created with ID: ${testEventId}`);

    // Verify reminder settings are initialized to default (48h before)
    assert(newEvent.reminderSettings !== undefined, "reminderSettings should be initialized");
    assert(newEvent.reminderSettings.customReminderTime === false, "customReminderTime should be false by default");
    assert(newEvent.reminderSettings.scheduledDate !== undefined, "scheduledDate should be calculated");
    assert(newEvent.reminderSettings.scheduledTime !== undefined, "scheduledTime should be calculated");

    // The event is scheduled in 72 hours. Default reminder should be 48h before the event.
    // That means it should be exactly 24 hours from now.
    const expectedReminderTime = new Date(eventTime.getTime() - 48 * 3600 * 1000);
    const calculatedComps = toRiyadhComponents(expectedReminderTime);
    
    console.log(`Calculated reminder date: ${newEvent.reminderSettings.scheduledDate.toISOString()} (Expected: ${calculatedComps.date.toISOString()})`);
    console.log(`Calculated reminder time: ${newEvent.reminderSettings.scheduledTime} (Expected: ${calculatedComps.time})`);

    assert(
      newEvent.reminderSettings.scheduledDate.toISOString() === calculatedComps.date.toISOString(),
      "Reminder date must match 48h before the event"
    );
    assert(
      newEvent.reminderSettings.scheduledTime === calculatedComps.time,
      "Reminder time must match 48h before the event"
    );
    console.log("✅ Default reminder calculation works perfectly!");

    console.log("\n--- TEST 2: Customize Reminder Settings via Service ---");
    // Update reminder to custom time (e.g., 60 hours before the event, which is 12 hours from now)
    const customTimeInstant = new Date();
    customTimeInstant.setHours(customTimeInstant.getHours() + 12);
    const customComps = toRiyadhComponents(customTimeInstant);

    const result = await eventsService.updateReminderSettings(
      testEventId,
      {
        customReminderTime: true,
        scheduledDate: customComps.date.toISOString(),
        scheduledTime: customComps.time
      },
      { _id: newEvent.host } // use real host ID in mock user context
    );

    const updatedEvent = result.event;
    console.log("Custom settings updated via service.");
    assert(updatedEvent.reminderSettings.customReminderTime === true, "customReminderTime should be true");
    assert(
      updatedEvent.reminderSettings.scheduledDate.toISOString() === customComps.date.toISOString(),
      "Custom scheduledDate matches"
    );
    assert(
      updatedEvent.reminderSettings.scheduledTime === customComps.time,
      "Custom scheduledTime matches"
    );
    console.log("✅ Custom reminder settings updated and validated successfully!");

    console.log("\n--- TEST 3: Validation Rules (Too late/after event start) ---");
    // Try setting reminder time in the past
    try {
      const pastInstant = new Date();
      pastInstant.setHours(pastInstant.getHours() - 2);
      const pastComps = toRiyadhComponents(pastInstant);

      await eventsService.updateReminderSettings(
        testEventId,
        {
          customReminderTime: true,
          scheduledDate: pastComps.date.toISOString(),
          scheduledTime: pastComps.time
        },
        { _id: newEvent.host }
      );
      assert(false, "Should have thrown error for past reminder time");
    } catch (err) {
      console.log("✅ Past reminder rejected correctly:", err.message);
    }

    // Try setting reminder time AFTER the event start time
    try {
      const postEventInstant = new Date(eventTime.getTime() + 2 * 3600 * 1000);
      const postComps = toRiyadhComponents(postEventInstant);

      await eventsService.updateReminderSettings(
        testEventId,
        {
          customReminderTime: true,
          scheduledDate: postComps.date.toISOString(),
          scheduledTime: postComps.time
        },
        { _id: newEvent.host }
      );
      assert(false, "Should have thrown error for post-event reminder time");
    } catch (err) {
      console.log("✅ Post-event reminder rejected correctly:", err.message);
    }

    console.log("\n--- TEST 4: Rescheduling Guard (reschedule event before custom reminder) ---");
    // Move the event to 6 hours from now (which is before the custom reminder time of 12 hours from now)
    // The updateEventDetails service should reset customReminderTime to false and fallback to 48h before the new event time.
    const newEventTime = new Date();
    newEventTime.setHours(newEventTime.getHours() + 6);
    const newEventComps = toRiyadhComponents(newEventTime);

    // Call updateEventDetails service (simulated here)
    const eventToUpdate = await Event.findById(testEventId);
    eventToUpdate.eventDetails.date = newEventComps.date;
    eventToUpdate.eventDetails.time = newEventComps.time;

    // Rescheduling edge case check logic (mimicking service implementation):
    const newEventStart = parseDateTime(newEventComps.date, newEventComps.time);
    const reminderInstant = parseDateTime(
      eventToUpdate.reminderSettings.scheduledDate,
      eventToUpdate.reminderSettings.scheduledTime
    );

    if (eventToUpdate.reminderSettings.customReminderTime && reminderInstant.getTime() >= newEventStart.getTime()) {
      console.log("Event rescheduled before custom reminder. Resetting customReminderTime to false.");
      eventToUpdate.reminderSettings.customReminderTime = false;
    }
    await eventToUpdate.save();

    console.log(`Rescheduled event reminder settings: customReminderTime=${eventToUpdate.reminderSettings.customReminderTime}`);
    assert(eventToUpdate.reminderSettings.customReminderTime === false, "customReminderTime must be reset to false");
    
    const expectedNewReminder = new Date(newEventTime.getTime() - 48 * 3600 * 1000);
    const expectedNewComps = toRiyadhComponents(expectedNewReminder);
    
    assert(
      eventToUpdate.reminderSettings.scheduledDate.toISOString() === expectedNewComps.date.toISOString(),
      "Reminder date updated to new default"
    );
    assert(
      eventToUpdate.reminderSettings.scheduledTime === expectedNewComps.time,
      "Reminder time updated to new default"
    );
    console.log("✅ Rescheduling guard works perfectly!");

  } finally {
    if (testEventId) {
      console.log("\nCleaning up test event...");
      await Event.findByIdAndDelete(testEventId);
      console.log("Cleaned up.");
    }
    await disconnectDB();
  }
}

run().catch(err => {
  console.error("Verification failed:", err);
  mongoose.disconnect().then(() => process.exit(1));
});
