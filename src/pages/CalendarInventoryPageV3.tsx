// ════════════════════════════════════════════════════════════════════
// CalendarInventoryPageV3 — wrapper avec nouveau design Atelier 2026
// Point d'entrée pour le calendrier ultra moderne Multi + Simple views
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from 'react';
import moment from 'moment';
import { DashboardWrapper } from '../components/DashboardWrapper';
import listingsService from '../services/listingsService';
import calendarService from '../services/calendarService';
import type { Listing as ListingType } from '../types/listings.types';

// Import nouveau design (pour le moment en JSX, on migrera en TS progressivement)
import CalendarInventoryPage from '../components/calendar-v3/CalendarInventoryPage.jsx';

// Adapter les types
interface AdaptedListing {
  _id: string;
  name: string;
  currencyCode: string;
  photoColor: string;
  photoColorDeep: string;
  roomTypes: Array<{
    _id: string;
    name: string;
    inventories: Record<string, any>;
  }>;
}

export function CalendarInventoryPageV3() {
  const staging = JSON.parse(localStorage.getItem('isStaging') || 'false');

  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<ListingType[]>([]);
  const [inventoryData, setInventoryData] = useState<any>({});
  const [currentDate, setCurrentDate] = useState(moment());

  // Fetch listings + inventory
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // 1. Récupérer listings
        const listingsResponse = await listingsService.getListingsForCalendar(0, 100, {
          active: true,
          staging,
        });

        console.log('[CalendarV3] listingsResponse:', {
          success: listingsResponse?.success,
          hasData: !!listingsResponse?.data,
          dataIsArray: Array.isArray(listingsResponse?.data),
          dataLength: Array.isArray(listingsResponse?.data) ? listingsResponse.data.length : 'not array',
        });

        // Verify response has expected structure
        if (!listingsResponse?.success || !Array.isArray(listingsResponse?.data)) {
          console.error('[CalendarV3] Invalid API response structure:', listingsResponse);
          setListings([]);
          setInventoryData({});
          setLoading(false);
          return;
        }

        const listingsData = listingsResponse.data;

        console.log('[CalendarV3] listingsData extracted:', {
          length: listingsData.length,
          firstListing: listingsData[0],
        });

        if (listingsData.length === 0) {
          console.warn('[CalendarV3] No listings found');
          setListings([]);
          setInventoryData({});
          setLoading(false);
          return;
        }

        setListings(listingsData);

        // 2. Récupérer inventaire
        const listingIds = listingsData.map((l) => l._id);
        const from = currentDate.clone().format('YYYY-MM-DD');
        const to = currentDate.clone().add(30, 'days').format('YYYY-MM-DD');

        const inventory = await calendarService.getInventoryForListings(
          listingIds,
          from,
          to,
          true // includeBookings
        );

        // Process inventory response to match expected format
        if (inventory && Array.isArray(inventory)) {
          console.log('[CalendarV3] Raw inventory array:', inventory);
          console.log('[CalendarV3] First listing in inventory:', inventory[0]);

          const processedData: any = {};
          inventory.forEach((listing: any) => {
            console.log('[CalendarV3] Processing listing:', {
              listingId: listing.listingId,
              roomTypesCount: listing.roomTypes?.length,
              roomTypes: listing.roomTypes,
            });

            processedData[listing.listingId] = {};
            (listing.roomTypes || []).forEach((room: any) => {
              console.log('[CalendarV3] Processing room:', {
                roomTypeId: room.roomTypeId,
                name: room.name,
                availableRoomsByDayCount: room.availableRoomsByDay?.length,
                firstDay: room.availableRoomsByDay?.[0],
              });

              processedData[listing.listingId][room.roomTypeId] = {
                name: room.name,
                availability: (room.availableRoomsByDay || []).reduce(
                  (dayAcc: Record<string, any>, day: any) => {
                    const dateStr = moment(day.date).format('YYYY-MM-DD');
                    dayAcc[dateStr] = {
                      availableRoom: day.availableRoom,
                      basePrice: day.basePrice,
                      calculatedPrice: day.calculatedPrice,
                      manualPrice: day.manualPrice,
                      applyManual: day.applyManual,
                      stopSell: day.stopSell,
                      useDynamicPrice: day.useDynamicPrice,
                      minStay: day.min_stay_arrival,
                      maxStay: day.max_stay,
                      closedArrival: day.closed_to_arrival,
                      closedDeparture: day.closed_to_departure,
                      reservations: day.reservations || [],
                    };
                    return dayAcc;
                  },
                  {}
                ),
              };
            });
          });

          console.log('[CalendarV3] Processed inventory data:', processedData);
          console.log('[CalendarV3] First listing processed:', processedData[Object.keys(processedData)[0]]);
          setInventoryData(processedData);
        }
      } catch (error) {
        console.error('Erreur chargement calendrier:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [currentDate, staging]);

  // Adapter les listings pour le nouveau format attendu par le design
  const adaptedListings: AdaptedListing[] = useMemo(() => {
    if (!Array.isArray(listings)) return [];

    console.log('[CalendarV3] Adapting listings:', {
      listingsCount: listings.length,
      inventoryDataKeys: Object.keys(inventoryData),
    });

    return listings.map((listing) => {
      const listingInv = inventoryData[listing._id];

      // Get roomTypeId from inventory data instead of listing.roomTypes
      // because the API doesn't return roomTypes in the listing response
      const roomTypeIds = listingInv ? Object.keys(listingInv) : [];
      const firstRoomTypeId = roomTypeIds[0];
      const roomInv = firstRoomTypeId ? listingInv?.[firstRoomTypeId] : null;

      console.log('[CalendarV3] Adapting listing:', {
        listingId: listing._id,
        listingName: listing.name,
        hasListingInv: !!listingInv,
        roomTypeIds: roomTypeIds,
        firstRoomTypeId: firstRoomTypeId,
        hasRoomInv: !!roomInv,
        roomName: roomInv?.name,
      });

      return {
        _id: listing._id,
        name: listing.name,
        currencyCode: listing.currencyCode || 'MAD',
        photoColor: listing.photoColor || '#fde68a',
        photoColorDeep: listing.photoColorDeep || '#d97706',
        roomTypes: [
          {
            _id: firstRoomTypeId || 'default',
            name: roomInv?.name || 'Standard',
            inventories: roomInv?.availability || {},
          },
        ],
      };
    });
  }, [listings, inventoryData]);

  // Inventaires par listing (pour SimpleView)
  const inventoriesByListing = useMemo(() => {
    const result: Record<string, Record<string, any>> = {};
    if (!Array.isArray(listings)) return result;
    listings.forEach((listing) => {
      const listingInv = inventoryData[listing._id];
      // Get first roomTypeId from inventory instead of listing.roomTypes
      const roomTypeIds = listingInv ? Object.keys(listingInv) : [];
      const firstRoomTypeId = roomTypeIds[0];
      const roomInv = firstRoomTypeId ? listingInv?.[firstRoomTypeId] : null;
      result[listing._id] = roomInv?.availability || {};
    });
    return result;
  }, [listings, inventoryData]);

  // Handler pour mise à jour inventaire
  const handleUpdateInventory = async (payloads: any[]) => {
    try {
      // Envoyer chaque payload en parallèle
      await Promise.all(
        payloads.map((payload) => calendarService.updateCalendar(payload))
      );

      // Refetch inventory après save
      const listingIds = listings.map((l) => l._id);
      const from = currentDate.clone().format('YYYY-MM-DD');
      const to = currentDate.clone().add(30, 'days').format('YYYY-MM-DD');

      const inventory = await calendarService.getInventoryForListings(
        listingIds,
        from,
        to,
        true // includeBookings
      );

      // Process inventory response to match expected format
      if (inventory && Array.isArray(inventory)) {
        const processedData: any = {};
        inventory.forEach((listing: any) => {
          processedData[listing.listingId] = {};
          (listing.roomTypes || []).forEach((room: any) => {
            processedData[listing.listingId][room.roomTypeId] = {
              name: room.name,
              availability: (room.availableRoomsByDay || []).reduce(
                (dayAcc: Record<string, any>, day: any) => {
                  const dateStr = moment(day.date).format('YYYY-MM-DD');
                  dayAcc[dateStr] = {
                    availableRoom: day.availableRoom,
                    basePrice: day.basePrice,
                    calculatedPrice: day.calculatedPrice,
                    manualPrice: day.manualPrice,
                    applyManual: day.applyManual,
                    stopSell: day.stopSell,
                    useDynamicPrice: day.useDynamicPrice,
                    minStay: day.min_stay_arrival,
                    maxStay: day.max_stay,
                    closedArrival: day.closed_to_arrival,
                    closedDeparture: day.closed_to_departure,
                    reservations: day.reservations || [],
                  };
                  return dayAcc;
                },
                {}
              ),
            };
          });
        });
        setInventoryData(processedData);
      }
    } catch (error) {
      console.error('Erreur mise à jour inventaire:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <DashboardWrapper>
        <div style={{ padding: '40px', textAlign: 'center', color: '#7a756c' }}>
          Chargement du calendrier...
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <CalendarInventoryPage
        startDate={currentDate.toDate()}
        listings={adaptedListings}
        inventoriesByListing={inventoriesByListing}
        inventoryData={inventoryData}
        defaultView="multi"
        onUpdateInventory={handleUpdateInventory}
      />
    </DashboardWrapper>
  );
}

export default CalendarInventoryPageV3;
