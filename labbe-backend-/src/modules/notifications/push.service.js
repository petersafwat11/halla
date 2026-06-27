/**
 * Push delivery via the Expo Push API (expo-server-sdk).
 *
 * Sends to a user's registered Expo push tokens, chunks per Expo's limits, and
 * prunes tokens Expo reports as DeviceNotRegistered so dead tokens don't
 * accumulate. All failures are logged and swallowed — push is best-effort and
 * must never break in-app notification creation.
 *
 * @module modules/notifications/push.service
 */

const { Expo } = require("expo-server-sdk");
const logger = require("../../shared/utils/logger");
const User = require("../../../models/UserModel");

// EXPO_ACCESS_TOKEN is optional; it raises rate limits + enables enhanced
// security on the push route. Works without it.
const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN
    ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
    : undefined
);

class PushService {
  /**
   * Send a push to all of a user's devices.
   * @param {string} userId
   * @param {{title?:string, titleAr?:string, body?:string, bodyAr?:string, data?:object}} payload
   */
  async sendToUser(userId, payload = {}) {
    try {
      const user = await User.findById(userId).select(
        "pushTokens preferredLanguage"
      );
      const tokens = (user?.pushTokens || []).filter((t) =>
        Expo.isExpoPushToken(t)
      );
      if (!tokens.length) return;

      const ar = user?.preferredLanguage === "ar";
      const title = (ar ? payload.titleAr : payload.title) || payload.title || "";
      const body = (ar ? payload.bodyAr : payload.body) || payload.body || "";

      const messages = tokens.map((to) => ({
        to,
        sound: "default",
        title,
        body,
        data: payload.data || {},
      }));

      const invalidTokens = [];
      for (const chunk of expo.chunkPushNotifications(messages)) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          tickets.forEach((ticket, i) => {
            if (
              ticket.status === "error" &&
              ticket.details?.error === "DeviceNotRegistered"
            ) {
              invalidTokens.push(chunk[i].to);
            }
          });
        } catch (err) {
          logger.error("[push] chunk send failed", { error: err.message });
        }
      }

      if (invalidTokens.length) {
        await User.updateOne(
          { _id: userId },
          { $pull: { pushTokens: { $in: invalidTokens } } }
        ).catch((err) =>
          logger.warn("[push] invalid-token prune failed", {
            error: err.message,
          })
        );
      }
    } catch (err) {
      logger.error("[push] sendToUser failed", {
        userId: String(userId),
        error: err.message,
      });
    }
  }

  /**
   * Register (add) a push token for a user, deduped.
   * @param {string} userId
   * @param {string} token - Expo push token
   */
  async registerToken(userId, token) {
    if (!token || !Expo.isExpoPushToken(token)) {
      const err = new Error("Invalid Expo push token");
      err.statusCode = 400;
      throw err;
    }
    await User.updateOne(
      { _id: userId },
      { $addToSet: { pushTokens: token } }
    );
    return { registered: true };
  }
}

module.exports = new PushService();
