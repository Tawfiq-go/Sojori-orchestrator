import { useCallback, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { MultiBuildingSection } from './MultiBuildingSection';
import { RoomTypeCards } from './RoomTypeCards';
import { MultiRecapPanel } from './MultiRecapPanel';
import {
  buildEmptyMultiCreateValues,
  multiTokens as t,
  type MultiCreateValues,
  type MultiListingImage,
} from './multiTypes';
import { uploadMultipleImagesToAPI } from '../../../redux/slices/UploadSlice';
import { btnGhostSx, btnPrimarySx } from '../../dashboard/DashboardV2.components';

type Props = {
  initialValues?: MultiCreateValues;
  onSave: (values: Record<string, unknown>) => void;
  isSaving?: boolean;
  onBack?: () => void;
};

function extractUrls(result: unknown): string[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    return result
      .map((row) => {
        if (typeof row === 'string') return row;
        if (row && typeof row === 'object' && 'url' in row) return String((row as { url: string }).url);
        return '';
      })
      .filter(Boolean);
  }
  if (typeof result === 'object' && result && 'urls' in result) {
    const urls = (result as { urls?: unknown }).urls;
    return Array.isArray(urls) ? urls.map(String) : [];
  }
  return [];
}

export function MultiListingCreateShell({
  initialValues,
  onSave,
  isSaving,
  onBack,
}: Props) {
  const dispatch = useDispatch();
  const [values, setValues] = useState<MultiCreateValues>(
    () => initialValues || buildEmptyMultiCreateValues(),
  );
  const [editingKey, setEditingKey] = useState<string | null>(
    () => values.roomTypes[0]?._key || null,
  );
  const [uploadingCommon, setUploadingCommon] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const patch = useCallback((partial: Partial<MultiCreateValues>) => {
    setValues((prev) => ({ ...prev, ...partial }));
  }, []);

  const uploadFiles = async (files: FileList): Promise<MultiListingImage[]> => {
    const list = Array.from(files).slice(0, 12);
    if (list.length === 0) return [];
    const result = await dispatch(
      uploadMultipleImagesToAPI({ files: list, folder: 'listings' }) as never,
    ).unwrap();
    const urls = extractUrls(result);
    return urls.map((url, i) => ({
      url,
      sortOrder: i,
      fileName: list[i]?.name || null,
    }));
  };

  const handleCommonFiles = async (files: FileList) => {
    setUploadingCommon(true);
    try {
      const added = await uploadFiles(files);
      patch({ listingImages: [...values.listingImages, ...added] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload photos communes échoué');
    } finally {
      setUploadingCommon(false);
    }
  };

  const handleTypeFiles = async (roomKey: string, files: FileList) => {
    setUploadingKey(roomKey);
    try {
      const added = await uploadFiles(files);
      setValues((prev) => ({
        ...prev,
        roomTypes: prev.roomTypes.map((rt) =>
          rt._key === roomKey
            ? { ...rt, roomTypeImages: [...(rt.roomTypeImages || []), ...added] }
            : rt,
        ),
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload photos type échoué');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = () => {
    if (!values.name?.trim()) {
      toast.error('Nom de l’établissement requis');
      return;
    }
    if (!values.address?.trim()) {
      toast.error('Adresse requise');
      return;
    }
    if (!values.city?.trim() || !values.cityId?.trim() || !values.country?.trim()) {
      toast.error('Ville, City ID et Pays sont requis (comme en Single)');
      return;
    }
    if (!values.roomTypes.length) {
      toast.error('Ajoutez au moins un type de chambre');
      return;
    }
    for (const rt of values.roomTypes) {
      if (!rt.roomTypeName?.trim()) {
        toast.error('Chaque type doit avoir un nom');
        return;
      }
      if (!rt.roomNumber || rt.roomNumber < 1) {
        toast.error(`Stock invalide pour « ${rt.roomTypeName} » (min. 1)`);
        return;
      }
    }

    const payload: Record<string, unknown> = {
      ...values,
      propertyUnit: 'Multi',
      roomTypes: values.roomTypes.map((rt, ranking) => {
        const roomNumber = Math.max(1, Number(rt.roomNumber) || 1);
        const rooms = Array.from({ length: roomNumber }, (_, i) => ({
          roomNumber: i + 1,
          roomName: `${rt.roomTypeName} ${i + 1}`,
          roomCode: `RT${ranking + 1}-${i + 1}`,
          address: values.address || '',
          enabled: true,
        }));
        return {
          roomTypeName: rt.roomTypeName,
          basePrice: rt.basePrice,
          ratePlanIds: rt.ratePlanIds || [],
          amenitiesIds: rt.amenitiesIds || [],
          roomTypeImages: rt.roomTypeImages || [],
          bedTypes: rt.bedTypes || [],
          useAddress: rt.useAddress !== false,
          active: rt.active !== false,
          personCapacity: rt.personCapacity || 1,
          personCapacityMax: rt.personCapacityMax || rt.personCapacity || 1,
          bedroomsNumber: rt.bedroomsNumber || 1,
          bedsNumber: rt.bedsNumber || 1,
          bathroomsNumber: rt.bathroomsNumber || 1,
          roomNumber,
          startCode: rt.startCode || 0,
          ranking: rt.ranking ?? ranking,
          surface: rt.surface || 0,
          roomAmenities: rt.roomAmenities || [],
          rooms,
          ...(rt._id ? { _id: rt._id } : {}),
        };
      }),
    };
    onSave(payload);
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          background: t.primaryTint,
          border: '1px solid rgba(230,176,34,0.35)',
          borderRadius: '12px',
          p: 1.75,
          mb: 2.5,
        }}
      >
        <Box sx={{ fontSize: 20 }}>🏛</Box>
        <Typography sx={{ fontSize: 13, color: t.text2, lineHeight: 1.5 }}>
          <b>Structure Multi.</b> Cas le plus simple : <b>1 type × N unités</b> (ex. 8
          chambres identiques — changez juste le stock). Ajoutez d&apos;autres types si le
          bâtiment a plusieurs catégories (Standard + Suite…). Les ops full-service
          (plan / codes par chambre) arriveront en V1.1 — pour l&apos;instant : distribution
          & calendrier.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 336px' },
          gap: 2.75,
          alignItems: 'start',
        }}
      >
        <Box>
          <MultiBuildingSection
            values={values}
            onChange={patch}
            uploading={uploadingCommon}
            onPickCommonFiles={handleCommonFiles}
          />
          <RoomTypeCards
            roomTypes={values.roomTypes}
            editingKey={editingKey}
            onEditingKey={setEditingKey}
            onChange={(roomTypes) => patch({ roomTypes })}
            uploadingKey={uploadingKey}
            onPickFiles={handleTypeFiles}
          />
        </Box>
        <MultiRecapPanel values={values} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mt: 3, flexWrap: 'wrap' }}>
        {onBack && (
          <Button sx={btnGhostSx} onClick={onBack} disabled={isSaving}>
            Changer le type
          </Button>
        )}
        <Button sx={btnPrimarySx} onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Création…' : 'Créer la structure Multi'}
        </Button>
      </Box>
    </Box>
  );
}
