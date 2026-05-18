import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';

const FinalStep = ({ onSubmit, onBack, data }) => {
  const { t } = useTranslation('common');
  const formatTime = (timeObj) => {
    if (!timeObj || !timeObj.enabled) return t('Not_configured');
    const { day, hours, minutes } = timeObj;
    return `${day || 0} ${t('Days')}, ${hours || 0} ${t('Hours')}, ${minutes || 0} ${t('Minutes')}`;
  };

  return (
    <Box className="p-2">
      <Card className="rounded-lg shadow-md">
        <CardContent className="space-y-4">
          <Box className="text-center">
            <Typography variant="h6" className="!text-base mb-1">{t('Review_and_Save')}</Typography>
            <Typography className="!text-xs text-gray-500">
              {t('Please_review_your_template_configuration_before_saving')}
            </Typography>
          </Box>

          <Box className="space-y-4">
            <Box>
              <Typography variant="subtitle1" className="!text-sm mb-2">{t('Template_Metadata')}</Typography>
              <Typography className="!text-xs mb-1">
                <Box component="span" className="mr-2 font-medium">{t('Type')}:</Box> {data.type}
              </Typography>
              
              <Typography className="!text-xs">
                <Box component="span" className="mr-2 font-medium">{t('Message_Name')}:</Box> {t(data.messageName)}
              </Typography>
              <Divider className="mt-2" />
            </Box>

            <Box>
              <Typography variant="subtitle1" className="!text-sm mb-2">{t('Content')}</Typography>
              <Typography className="!text-xs mb-1">
                <Box component="span" className="block mb-1 font-medium">{t('French_Content')}:</Box>
                <pre className="p-2 overflow-x-auto overflow-y-auto text-xs bg-gray-100 rounded max-h-40">
                  {data.content || 'No content'}
                </pre>
              </Typography>
              <Typography className="!text-xs mt-2">
                <Box component="span" className="block mb-1 font-medium">{t('English_Content')}:</Box>
                <pre className="p-2 overflow-x-auto overflow-y-auto text-xs bg-gray-100 rounded max-h-40">
                  {data.contentEng || 'No content'}
                </pre>
              </Typography>
              <Divider className="mt-2" />
            </Box>

            <Box>
              <Typography variant="subtitle1" className="!text-sm mb-2">{t('Reservation_Timing')}</Typography>
              <Typography className="!text-xs mb-1">
                <Box component="span" className="mr-2 font-medium">{t('Immediately')}:</Box> 
                {formatTime(data.reservation?.immediately)}
              </Typography>
              <Typography className="!text-xs">
                <Box component="span" className="mr-2 font-medium">{t('After_Reservation')}:</Box> 
                {formatTime(data.reservation?.after)}
              </Typography>
              <Divider className="mt-2" />
            </Box>

            <Box>
              <Typography variant="subtitle1" className="!text-sm mb-2">{t('Arrival_Date_Settings')}</Typography>
              <Typography className="!text-xs mb-1">
                <Box component="span" className="mr-2 font-medium">{t('Before_Arrival')}:</Box> 
                {formatTime(data.arrivalDate?.before)}
              </Typography>
              <Typography className="!text-xs">
                <Box component="span" className="mr-2 font-medium">{t('After_Arrival')}:</Box> 
                {formatTime(data.arrivalDate?.after)}
              </Typography>
              <Divider className="mt-2" />
            </Box>

            <Box>
              <Typography variant="subtitle1" className="!text-sm mb-2">{t('Departure_Date_Settings')}</Typography>
              <Typography className="!text-xs mb-1">
                <Box component="span" className="mr-2 font-medium">{t('Before_Departure')}:</Box> 
                {formatTime(data.departureDate?.before)}
              </Typography>
              <Typography className="!text-xs">
                <Box component="span" className="mr-2 font-medium">{t('After_Departure')}:</Box> 
                {formatTime(data.departureDate?.after)}
              </Typography>
            </Box>
          </Box>

          <Box className="flex justify-end space-x-2">
            <button 
              onClick={onBack} 
              className="!px-4 !py-2 !text-xs !border !rounded !hover:bg-gray-100 !transition-colors"
            >
              {t('Back')}
            </button>
            <button
              onClick={onSubmit}
              className="!px-4 !py-2 !text-xs !bg-medium-aquamarine !text-white !rounded !hover:bg-opacity-90 !transition-colors"
            >
              {t('Save_Template')}
            </button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FinalStep;