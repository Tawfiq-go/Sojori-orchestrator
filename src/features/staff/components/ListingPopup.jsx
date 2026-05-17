import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, CircularProgress, IconButton } from '@mui/material';
import { X, Users, Bed, Bath, MapPin, CheckCircle, ChartNoAxesGantt } from 'lucide-react';
import { getOneListing, getListings } from '../../listing/services/serverApi.listing';
import { Link } from 'react-router-dom';
const ListingPopup = ({
  open,
  onClose,
  listingIds
}) => {
  const {
    t
  } = useTranslation('common');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchListings = async () => {
      if (!open || !listingIds?.length) return;
      setLoading(true);
      setError(null);
      try {
        let listingResults;
        if (listingIds[0] === 'All') {
          const response = await getListings({
            page: 0,
            limit: 20,
            name: '',
            city: '',
            country: '',
            sortingBy: '',
            staging: false
          });
          listingResults = response.data.data;
        } else {
          const listingPromises = listingIds.map(id => getOneListing(id));
          listingResults = await Promise.all(listingPromises);
        }
        setListings(listingResults.filter(Boolean));
      } catch (error) {
        setError(t('Failed to load listings. Please try again.'));
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [open, listingIds, t]);
  const formatCapacityInfo = roomType => {
    if (!roomType) return [];
    return [{
      icon: <Users className="h-3 w-3" />,
      value: roomType.personCapacity,
      label: t('guests')
    }, {
      icon: <Bed className="h-3 w-3" />,
      value: roomType.bedroomsNumber,
      label: t('bed')
    }, {
      icon: <Bath className="h-3 w-3" />,
      value: roomType.bathroomsNumber,
      label: t('bath')
    }].filter(item => item.value);
  };
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
    className: 'rounded-lg'
  }}>
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-lg font-medium text-gray-900">
            {t('Staff Listings')}
          </span>
          <IconButton onClick={onClose} className="text-gray-400 hover:text-gray-500" size="small">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      <div className="p-4 overflow-auto max-h-[calc(100vh-200px)]">
        {loading ? <div className="flex justify-center items-center h-32">
            <CircularProgress size={32} className="text-teal-500" />
          </div> : error ? <div className="text-center py-8">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-sm text-teal-600 hover:text-teal-500">
              {t('Try again')}
            </button>
          </div> : listings.length === 0 ? <div className="text-center py-8">
            <p className="text-gray-500 text-sm">{t('No listings found')}</p>
          </div> : <div className="space-y-3">
            {listings.map(listing => <div key={listing._id} className="border rounded-lg p-3 hover:shadow-sm transition-all bg-white mb-1 relative">
                <div className="flex gap-3">
                  <div className="w-24 h-24 flex-shrink-0">
                    {listing.listingImages?.[0]?.url ? <img src={listing.listingImages[0].url} alt={listing.name} className="w-full h-full object-cover rounded-md" loading="lazy" /> : <div className="w-full h-full bg-gray-50 rounded-md flex items-center justify-center">
                        <span className="text-gray-400 text-xs">{t('No image')}</span>
                      </div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-md text-gray-900 truncate">
                        {listing.name}
                      </span>
                      <span className="inline-block bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        {listing.propertyType}
                      </span>
                    </div>

                    <div className="absolute right-4">
                      <Link state={{
                  data: listing
                }} to="/admin/Listing/Listing_Details">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                          <ChartNoAxesGantt className="h-3 w-3" />
                          {t('Details')}
                        </span>
                      </Link>
                    </div>

                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        {formatCapacityInfo(listing.roomTypes?.[0]).map((item, index) => <div key={index} className="flex items-center gap-1">
                              {item.icon}
                              <span>
                                {item.value} {item.label}
                              </span>
                            </div>)}
                      </div>

                      {listing.address && <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{listing.address}</span>
                        </div>}

                      <div className="flex gap-2 flex-wrap mt-1">
                        {listing.active && <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            {t('Active')}
                          </span>}
                      </div>

                      {/* {listing.roomTypes?.[0]?.basePrice && (
                                                <div className="text-xs font-medium text-gray-900 float-end">
                                                    {listing.roomTypes[0].basePrice} {listing.currencyCode || 'MAD'} / night
                                                </div>
                                            )} */}
                    </div>
                  </div>
                </div>
              </div>)}
          </div>}
      </div>

      <div className="sticky bottom-0 bg-white border-t p-4">
        <button onClick={onClose} className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
          {t('Close')}
        </button>
      </div>
    </Dialog>;
};
export default ListingPopup;
