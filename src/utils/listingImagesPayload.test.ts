import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanListingImagesForPayload } from './listingFormV2ApiAdapter';

/**
 * `updateProperty` reconstruit chaque image depuis le seul payload reçu : ce qui
 * n'est pas renvoyé est effacé en base. Les légendes n'ayant aucune UI de saisie,
 * les omettre ici les détruisait à chaque save de l'onglet Photos.
 */
describe('cleanListingImagesForPayload', () => {
  it('réémet les quatre légendes pour ne pas les effacer', () => {
    const [row] = cleanListingImagesForPayload([
      {
        url: 'https://gcs/a.webp',
        sortOrder: 3,
        caption: 'Salon vue jardin',
        bookingEngineCaption: 'Salon',
        airbnbCaption: 'Living room',
        vrboCaption: 'Lounge',
      },
    ]);

    assert.equal(row.caption, 'Salon vue jardin');
    assert.equal(row.bookingEngineCaption, 'Salon');
    assert.equal(row.airbnbCaption, 'Living room');
    assert.equal(row.vrboCaption, 'Lounge');
  });

  it('garde une légende vidée par l’utilisateur, sans la confondre avec une absence', () => {
    const [row] = cleanListingImagesForPayload([{ url: 'https://gcs/b.webp', caption: '' }]);

    assert.equal(row.caption, '');
    assert.ok(!('airbnbCaption' in row), 'une clé jamais fournie ne doit pas être inventée');
  });

  it('ignore les entrées sans url', () => {
    assert.equal(cleanListingImagesForPayload([{ caption: 'orpheline' }]).length, 0);
  });
});
