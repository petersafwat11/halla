const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const usersService = require("./users.service");

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
    passwordConfirm
  );
  sendSuccess(res, result, "Password updated successfully");
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
