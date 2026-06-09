import OrchestrationListingV3View from './OrchestrationListingV3View';

type Props = {
  listingId: string;
  ownerId?: string;
  listingName?: string;
};

/** Orchestration listing V3 — intégré dans le formulaire /listings/:id (onglet Config). */
export default function ListingOrchestrationV3Embed({ listingId, ownerId, listingName }: Props) {
  const ownerKey = ownerId ? String(ownerId) : 'global';
  const listings = [{ id: listingId, name: listingName || listingId }];

  return (
    <OrchestrationListingV3View
      embedded
      ownerKey={ownerKey}
      isAdminTemplate={false}
      listingId={listingId}
      listings={listings}
      onListingChange={() => {}}
      listingCount={1}
    />
  );
}
