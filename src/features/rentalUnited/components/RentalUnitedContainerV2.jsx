import React from 'react';
import OwnerSelectorV2 from './OwnerSelectorV2';
import RentalUnitedIframe from './RentalUnitedIframe';

const RentalUnitedContainerV2 = ({
  isAdmin,
  owners,
  selectedOwnerId,
  onOwnerChange,
  showOwnerSelector = true,
  scriptUrl,
  tokenData,
  openSection,
  onWidgetError,
}) => {
  return (
    <div className="w-full">
      {isAdmin && owners.length > 0 && showOwnerSelector && (
        <div className="">
          <OwnerSelectorV2
            owners={owners}
            selectedOwnerId={selectedOwnerId}
            onOwnerChange={onOwnerChange}
            title="Owner Selection"
            subtitle=""
          />
        </div>
      )}

      {/* Pas de bordure ici : le conteneur de page en dessine déjà une —
          deux cadres imbriqués donnaient un rendu « boîte dans une boîte ». */}
      <div className="bg-white !h-full">
        <div className="!h-full">
          {scriptUrl ? (
            <RentalUnitedIframe
              scriptUrl={scriptUrl}
              tokenData={tokenData}
              isAdmin={isAdmin}
              openSection={openSection}
              onWidgetError={onWidgetError}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                minHeight: '500px',
                width: '100%',
              }}
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medium-aquamarine mx-auto" />
                <p className="mt-2 text-gray-500">Initializing Rental United...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RentalUnitedContainerV2;
