/** Toggles RU / Channex — miroir de srv-user ownerChannelFlags.ts */

function ownerHasRuId(owner) {
  return Boolean(String(owner?.ruOwnerId || '').trim());
}

/** PM déjà lié à RU (toggle, channelManager ou ruOwnerId en base). */
export function isRuLinkedOwner(source = {}, values = {}) {
  const cm = String(values.channelManager ?? source.channelManager ?? '').trim();
  if (values.ruEnabled === true || source.ruEnabled === true) return true;
  if (cm === 'RU') return true;
  return ownerHasRuId(source) || ownerHasRuId(values);
}

export function channelFlagsFromOwner(owner) {
  const cm = String(owner?.channelManager || '').trim();
  const ruEnabled = owner?.ruEnabled === true || cm === 'RU' || ownerHasRuId(owner);
  return {
    ruEnabled,
    channexEnabled: !ruEnabled && cm === 'Channex',
    channelManager: ruEnabled ? 'RU' : cm === 'Channex' ? 'Channex' : cm,
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
