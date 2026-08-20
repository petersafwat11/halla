const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const usersService = require("./users.service");
const {
  setAuthCookies,
  requestContext,
  sendAuthResponse,
} = require("../auth/auth.controller");

exports.getMyProfile = catchAsync(async (req, res) => {
  const result = await usersService.getMyProfile(req.user._id);
  sendSuccess(res, result);
});

exports.updateMyProfile = catchAsync(async (req, res) => {
  const result = await usersService.updateMyProfile(
    req.user._id,
    req.body,
    req.files
  );
  sendSuccess(res, result, "Profile updated successfully");
});

exports.updateMyPassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, passwordConfirm } = req.body;
  const result = await usersService.updateMyPassword(
    req.user._id,
    currentPassword,
    newPassword,
    passwordConfirm,
    requestContext(req)
  );

  setAuthCookies(res, result);

  sendAuthResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    statusCode: 200,
    message: "Password updated successfully",
  });
});

exports.updateMyProfileSection = catchAsync(async (req, res) => {
  const { section } = req.params;
  const result = await usersService.updateMyProfileSection(
    req.user._id,
    section,
    req.body,
    req.files
  );
  sendSuccess(res, result, `${section} updated successfully`);
});

exports.sendPhoneChangeOtp = catchAsync(async (req, res) => {
  const { phoneNumber } = req.body;
  const lang = req.user?.preferredLanguage || "ar";
  const result = await usersService.sendPhoneChangeOtp(
    req.user._id,
    phoneNumber,
    lang
  );
  sendSuccess(res, result, "OTP sent to the new phone number");
});

exports.updatePhone = catchAsync(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const result = await usersService.updatePhone(req.user._id, phoneNumber, otp);
  sendSuccess(res, result, "Phone number updated successfully");
});

exports.deleteVendorImage = catchAsync(async (req, res) => {
  const { field, key } = req.body;
  const result = await usersService.deleteVendorImage(
    req.user._id,
    field,
    key
  );
  sendSuccess(res, result, "Image deleted successfully");
});

exports.getPreDeletionInfo = catchAsync(async (req, res) => {
  const result = await usersService.getPreDeletionInfo(req.user._id);
  // Tell the client which reauth credential to collect: password accounts use
  // their password; phone-only (password-less) accounts verify via OTP.
  result.reauthMethod = req.user.password ? "password" : "otp";
  sendSuccess(res, result);
});

// Sends a reauth OTP to the current user's verified phone (for password-less
// accounts about to delete). Rate-limited at the route.
exports.sendDeletionOtp = catchAsync(async (req, res) => {
  const result = await usersService.sendDeletionReauthOtp(req.user);
  sendSuccess(res, result, "Verification code sent");
});

exports.deleteMyAccount = catchAsync(async (req, res) => {
  // Reauthentication gate (§4.1): require the account password or a verified
  // OTP before this irreversible action. Throws REAUTH_* codes the client uses
  // to prompt for the right credential.
  const { password, otp } = req.body || {};
  await usersService.verifyReauth(req.user, { password, otp });

  const result = await usersService.deleteMyAccount(req.user._id, {
    channel: "app",
  });
  sendSuccess(res, result, "Account deletion processed");
});

// Public (no auth): the /delete-account page + app poll deletion status by the
// unguessable requestId, since the user's session is gone after deletion.
exports.getDeletionStatus = catchAsync(async (req, res) => {
  const result = await usersService.getDeletionStatus(req.params.requestId);
  sendSuccess(res, result);
});

exports.getNotificationPreferences = catchAsync(async (req, res) => {
  const result = await usersService.getNotificationPreferences(req.user._id);
  sendSuccess(res, result);
});

exports.updateNotificationPreferences = catchAsync(async (req, res) => {
  const result = await usersService.updateNotificationPreferences(
    req.user._id,
    req.body
  );
  sendSuccess(res, result, "Notification preferences updated");
});
