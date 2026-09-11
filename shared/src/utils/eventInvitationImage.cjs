// The finalized Step 3 design is the invitation image on every delivery surface.
function eventInvitationImage(event) {
  return event?.visualTemplate?.bakedImagePath || event?.templateImage || null;
}
module.exports = { eventInvitationImage };
