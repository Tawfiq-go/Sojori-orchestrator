import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { LandlordAccount } from '../types';
import { personName } from '../utils/format';
import { landlordListingCount } from '../utils/landlordListing';
import { SearchSelect } from '../utils/financesSearchSelect.tsx';
import {
  RECURRING_SCOPE_OPTIONS,
  listingsForLandlord,
  type ListingRow,
  type RecurringScopeType,
} from '../utils/recurringScope.tsx';

export type { ListingRow };

export type RecurringAssociationValue = {
  scopeType: RecurringScopeType;
  listingIds: string[];
  landlordId: string;
};

type Props = {
  value: RecurringAssociationValue;
  onChange: (patch: Partial<RecurringAssociationValue>) => void;
  listings: ListingRow[];
  landlords: LandlordAccount[];
  landlordsLoading?: boolean;
};

export function RecurringAssociationFields({
  value,
  onChange,
  listings,
  landlords,
  landlordsLoading,
}: Props) {
  const selectedLandlord = useMemo(
    () => landlords.find((l) => l._id === value.landlordId),
    [landlords, value.landlordId],
  );

  const landlordListings = useMemo(
    () => listingsForLandlord(listings, selectedLandlord),
    [listings, selectedLandlord],
  );

  const landlordOptions = useMemo(
    () =>
      landlords.map((l) => ({
        value: l._id,
        label: personName(l.firstName, l.lastName, l.email || l._id),
        hint: `${landlordListingCount(l)} annonce(s)`,
      })),
    [landlords],
  );

  const toggleListing = (id: string) => {
    onChange({
      listingIds: value.listingIds.includes(id)
        ? value.listingIds.filter((x) => x !== id)
        : [...value.listingIds, id],
    });
  };

  return (
    <>
      <div className="fgrp">
        <div className="flabel">Rattachement</div>
        <div className="seg">
          {RECURRING_SCOPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={value.scopeType === o.value ? 'on' : ''}
              onClick={() =>
                onChange({
                  scopeType: o.value,
                  listingIds: [],
                  landlordId: '',
                })
              }
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="fhint">
          {RECURRING_SCOPE_OPTIONS.find((o) => o.value === value.scopeType)?.hint}
        </p>
      </div>

      {value.scopeType === 'listing' && (
        <div className="fgrp">
          <div className="flabel">
            Listings <span className="req">*</span>
          </div>
          <div className="chips">
            {listings.map((l) => {
              const id = String(l._id || l.id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`chip ${value.listingIds.includes(id) ? 'on' : ''}`}
                  onClick={() => toggleListing(id)}
                >
                  {l.name || l.title || id}
                </button>
              );
            })}
          </div>
          {!listings.length && (
            <p className="fhint">Chargement des annonces…</p>
          )}
        </div>
      )}

      {value.scopeType === 'pm' && (
        <div className="inote info" style={{ marginBottom: 16 }}>
          <span className="i">ℹ️</span>
          La charge sera enregistrée au niveau du <b>portefeuille PM</b> (sans listing ni propriétaire). Idéal pour frais
          transverses (comptabilité, outils, etc.).
        </div>
      )}

      {value.scopeType === 'landlord' && (
        <>
          <div className="fgrp">
            <div className="flabel">
              Propriétaire immobilier <span className="req">*</span>
            </div>
            <p className="fhint" style={{ marginTop: 0 }}>
              Comptes définis dans{' '}
              <Link to="/finances/landlords" className="fin-link">
                Finances → Propriétaires
              </Link>
              .
            </p>
            {landlordsLoading ? (
              <p className="fhint">Chargement des propriétaires…</p>
            ) : landlords.length ? (
              <SearchSelect
                options={landlordOptions}
                value={value.landlordId}
                required
                placeholder="Choisir un propriétaire…"
                searchPlaceholder="Nom, email…"
                onChange={(id) => onChange({ landlordId: id, listingIds: [] })}
              />
            ) : (
              <div className="inote warn" style={{ margin: 0 }}>
                <span className="i">⚠️</span>
                Aucun propriétaire —{' '}
                <Link to="/finances/landlords" className="fin-link">
                  ajoutez-en un ici
                </Link>
                .
              </div>
            )}
          </div>
          {value.landlordId && (
            <div className="fgrp">
              <div className="flabel">Annonces du proprio (optionnel)</div>
              <p className="fhint" style={{ marginTop: 0 }}>
                Cochez une ou plusieurs annonces, ou laissez tout décoché pour une charge <b>globale propriétaire</b>.
              </p>
              <div className="chips">
                {landlordListings.map((l) => {
                  const id = String(l._id || l.id);
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`chip ${value.listingIds.includes(id) ? 'on' : ''}`}
                      onClick={() => toggleListing(id)}
                    >
                      {l.name || l.title || id}
                    </button>
                  );
                })}
              </div>
              {!landlordListings.length && (
                <p className="fhint">Ce propriétaire n&apos;a pas encore d&apos;annonces rattachées.</p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function validateRecurringAssociation(value: RecurringAssociationValue): string | null {
  if (value.scopeType === 'listing' && !value.listingIds.length) {
    return 'Sélectionnez au moins un listing';
  }
  if (value.scopeType === 'landlord' && !value.landlordId) {
    return 'Sélectionnez un propriétaire';
  }
  return null;
}
