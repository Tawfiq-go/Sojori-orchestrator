import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickUploadablePhotos } from './partnerPhotoRules';

function file(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('pickUploadablePhotos', () => {
  it('keeps JPEG/PNG/WebP under 1 Mo, up to the free slots', () => {
    const files = [
      file('a.jpg', 'image/jpeg', 1000),
      file('b.png', 'image/png', 1000),
      file('c.webp', 'image/webp', 1000),
    ];
    const list = { length: 3, item: (i: number) => files[i], ...files } as unknown as FileList;
    const { valid, rejected } = pickUploadablePhotos(list, 2);
    assert.equal(valid.length, 2);
    assert.equal(rejected.length, 1);
  });
  it('rejects other types and files over 1 Mo with a readable reason', () => {
    const files = [file('x.gif', 'image/gif', 10), file('big.jpg', 'image/jpeg', 1_100_000)];
    const list = { length: 2, item: (i: number) => files[i], ...files } as unknown as FileList;
    const { valid, rejected } = pickUploadablePhotos(list, 3);
    assert.equal(valid.length, 0);
    assert.equal(rejected.length, 2);
    assert.match(rejected.join(' '), /gif|format/i);
    assert.match(rejected.join(' '), /1 Mo|Mo/);
  });
  it('returns nothing for a null list', () => {
    assert.deepEqual(pickUploadablePhotos(null, 3), { valid: [], rejected: [] });
  });
});
