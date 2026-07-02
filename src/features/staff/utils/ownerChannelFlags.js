/** Toggles RU / Channex — miroir de srv-user ownerChannelFlags.ts */

export function channelFlagsFromOwner(owner) {
  const ruEnabled =
    owner?.ruEnabled === true ||
    (owner?.ruEnabled !== false && String(owner?.channelManager || '').trim() === 'RU');
  return {
    ruEnabled,
    channexEnabled: false,
    channelManager: ruEnabled ? 'RU' : '',
  };
}

export function resolveOwnerChannelFlags(input = {}) {
  let ruEnabled = input.ruEnabled === true;
  const channexEnabled = false;

  if (input.ruEnabled == null && input.channexEnabled == null && input.channelManager) {
    const cm = String(input.channelManager).trim();
    ruEnabled = cm === 'RU';
  }

  let channelManager = '';
  if (ruEnabled) channelManager = 'RU';
  else if (channexEnabled) channelManager = 'Channex';

  return { ruEnabled, channexEnabled, channelManager };
}

export function applyChannelFlagsToFormValues(values) {
  const flags = resolveOwnerChannelFlags({
    ruEnabled: values?.ruEnabled,
    channexEnabled: values?.channexEnabled,
    channelManager: values?.channelManager,
  });
  return { ...values, ...flags };
}
