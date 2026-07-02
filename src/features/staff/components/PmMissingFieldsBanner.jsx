import React from 'react';

/** Bandeau fixe en haut du formulaire PM — champs manquants par action. */
export function PmMissingFieldsBanner({
  saveReadiness,
  activateReadiness,
  ruProvisionReadiness,
  ruFillCompanyReadiness,
  ruEnabled,
  hasRuOwnerId,
  canActivateDraft,
}) {
  const rows = [];

  if (saveReadiness && !saveReadiness.ready) {
    rows.push({ action: 'Enregistrer', missing: saveReadiness.missing });
  }
  if (canActivateDraft && activateReadiness && !activateReadiness.ready) {
    rows.push({ action: 'Activer', missing: activateReadiness.missing });
  }
  if (ruEnabled && ruProvisionReadiness && !hasRuOwnerId && !ruProvisionReadiness.ready) {
    const ruMissing = ruProvisionReadiness.missing.filter((m) => m !== 'Activer le toggle RU');
    if (ruMissing.length) {
      rows.push({ action: 'Créer dans RU', missing: ruMissing });
    }
  }
  if (ruEnabled && ruFillCompanyReadiness && !ruFillCompanyReadiness.ready) {
    const ruMissing = ruFillCompanyReadiness.missing.filter((m) => m !== 'Activer le toggle RU');
    if (ruMissing.length) {
      rows.push({
        action: hasRuOwnerId ? 'Créer entreprise RU' : 'Créer entreprise RU (après compte RU)',
        missing: ruMissing,
      });
    }
  }

  if (!rows.length) {
    return (
      <div className="owner-pm-missing-banner owner-pm-missing-banner--ok">
        Champs compte OK pour <b>Enregistrer</b>
        {canActivateDraft ? (
          <>
            {' '}
            et <b>Activer</b>
          </>
        ) : null}
        {ruEnabled && ruProvisionReadiness?.ready && !hasRuOwnerId ? (
          <>
            {' '}
            · prêt pour <b>Créer dans RU</b>
          </>
        ) : null}
        {ruEnabled && hasRuOwnerId && ruFillCompanyReadiness?.ready ? (
          <>
            {' '}
            · prêt pour <b>Créer entreprise RU</b>
          </>
        ) : null}
        {ruEnabled && hasRuOwnerId && !ruFillCompanyReadiness?.ready ? (
          <>
            {' '}
            · ID RU <b>{hasRuOwnerId}</b> — complétez Entreprise RU
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="owner-pm-missing-banner owner-pm-missing-banner--warn">
      <div className="owner-pm-missing-banner-h">Champs manquants</div>
      {rows.map((row) => (
        <div key={row.action} className="owner-pm-missing-row">
          <span className="owner-pm-missing-action">{row.action}</span>
          <span className="owner-pm-missing-list">{row.missing.join(' · ')}</span>
        </div>
      ))}
    </div>
  );
}

export default PmMissingFieldsBanner;
