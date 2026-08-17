"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  verifyWebhookSignature,
} = require("../src/modules/messaging/messaging.webhook.controller");

function withEnv(values, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const unsignedRequest = {
  rawBody: Buffer.from('{"test":true}'),
  get: () => "",
};

test("unsigned WhatsApp callbacks are temporarily accepted by default", () =>
  withEnv(
    {
      WHATSAPP_WEBHOOK_ALLOW_UNSIGNED: undefined,
      WHATSAPP_APP_SECRET: undefined,
      NODE_ENV: "production",
    },
    () => {
      assert.deepEqual(verifyWebhookSignature(unsignedRequest), {
        ok: true,
        reason: "unsigned_webhooks_temporarily_allowed",
      });
    }
  ));

test("setting the rollout flag to false restores production fail-closed behavior", () =>
  withEnv(
    {
      WHATSAPP_WEBHOOK_ALLOW_UNSIGNED: "false",
      WHATSAPP_APP_SECRET: undefined,
      NODE_ENV: "production",
    },
    () => {
      assert.deepEqual(verifyWebhookSignature(unsignedRequest), {
        ok: false,
        reason: "app_secret_not_configured",
      });
    }
  ));
