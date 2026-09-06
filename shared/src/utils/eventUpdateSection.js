// The legacy payload names remain accepted while older clients migrate.
export function eventUpdateSection(payload) {
  if (!payload) throw new Error('Missing event update payload');
  switch (payload.type) {
    case 'details':
    case 'eventDetails':
      return { section: 'details', data: payload.data };
    case 'people':
    case 'step2':
    case 'guestList':
      return { section: 'people', data: payload.data };
    case 'design':
    case 'visualTemplate':
      return { section: 'design', data: { visualTemplate: payload.data, templateImage: payload.templateImage } };
    case 'messages':
    case 'invitationSettings':
      return { section: 'messages', data: payload.data };
    default:
      throw new Error(`Unknown event update section: ${payload.type}`);
  }
}
