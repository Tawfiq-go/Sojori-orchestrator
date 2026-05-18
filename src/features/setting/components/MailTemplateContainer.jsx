import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box } from '@mui/material';
import { toast } from 'react-toastify';
import { getMailTemplateById } from '../services/serverApi.adminConfig';
import { getOrchestratorMailTemplateById } from '../services/serverApi.orchestratorConfig';
import MailTemplateForm from './MailTemplateForm';
import ConfigureForm from './ConfigureForm';
import MailTemplateTopBar from './MailTemplateTopBar';
const MailTemplateContainer = ({
  templateId = null,
  onSubmit,
  onCancel,
  templates,
  owners,
  isAdmin,
  useOrchestratorApi = false
}) => {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(templateId !== null);
  const [templateIdState, setTemplateIdState] = useState(templateId);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [aiMode, setAiMode] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Message',
    whatsappType: '',
    content: '',
    contentEng: '',
    whatsappContent: '',
    whatsappContentEng: '',
    messageName: 'CONFIRMATION_RESERVATION_AVEC_LIEN',
    description: '',
    enabled: true,
    whatsappEnabled: false,
    messageEnabled: true,
    ownerId: ''
    // Les champs de timing (reservation, arrivalDate, departureDate) ont été supprimés
    // Le timing est maintenant géré par l'Orchestrateur
  });
  const emailName = [{
    value: 'CONFIRMATION_RESERVATION_AVEC_LIEN',
    label: t('CONFIRMATION_RESERVATION_AVEC_LIEN')
  }, {
    value: 'RAPPEL_X_JOURS_AVANT_ARRIVEE',
    label: t('RAPPEL_X_JOURS_AVANT_ARRIVEE')
  }, {
    value: 'RAPPEL_COMPLET_CLIENT',
    label: t('RAPPEL_COMPLET_CLIENT')
  }, {
    value: 'RAPPEL_ENREGISTREMENT_MANQUANT',
    label: t('RAPPEL_ENREGISTREMENT_MANQUANT')
  }, {
    value: 'RAPPEL_HORAIRE_MANQUANT',
    label: t('RAPPEL_HORAIRE_MANQUANT')
  }, {
    value: 'RAPPEL_ACTIONS_MANQUANTES',
    label: t('RAPPEL_ACTIONS_MANQUANTES')
  }, {
    value: 'RAPPEL_SERVICES_PENDANT_SEJOUR',
    label: t('RAPPEL_SERVICES_PENDANT_SEJOUR')
  }, {
    value: 'RAPPEL_DEPART',
    label: t('RAPPEL_DEPART')
  }, {
    value: 'SOLLICITATION_NOTE_ABSENTE',
    label: t('SOLLICITATION_NOTE_ABSENTE')
  }];
  const noWhatsappTemplates = ['CONFIRMATION_RESERVATION_STANDARD', 'CONFIRMATION_RESERVATION_AVEC_LIEN', 'RAPPEL_7_JOURS_AVANT_ARRIVEE', 'RAPPEL_X_JOURS_AVANT_ARRIVEE'];
  const newEmailName = emailName;
  const emailTypes = [{
    value: 'Message',
    label: t('Message')
  }, {
    value: 'Whatsapp',
    label: t('Whatsapp')
  }];
  const allowedTypes = noWhatsappTemplates.includes(formData.messageName) ? [{
    value: 'Message',
    label: t('Message')
  }] : emailTypes;
  const renderOwnerSelect = () => {
    if (!isAdmin) return null;
    return <div className="flex flex-col gap-2">
        <label className="block text-sm">{t('Owner')}</label>
        <select className="w-full !px-2 !py-2 border rounded !text-sm" value={formData.ownerId} onChange={e => setFormData(prev => ({
        ...prev,
        ownerId: e.target.value
      }))}>
          <option value="">{t('Select Owner')}</option>
          {owners.map(owner => <option key={owner._id} value={owner._id}>
              {owner.email}
            </option>)}
        </select>
      </div>;
  };
  useEffect(() => {
    if (templateId) {
      fetchTemplateData(templateIdState);
    }
  }, [templateId]);
  const fetchTemplateData = async (id = templateIdState) => {
    try {
      setIsLoading(true);
      const response = useOrchestratorApi ? await getOrchestratorMailTemplateById(id) : await getMailTemplateById(id);
      const {
        success,
        data: template
      } = response?.data || {};
      if (success && template) {
        const hasAiPrompt = Boolean(template?.aiPrompt && String(template.aiPrompt).trim().length > 0);
        const isRappelX = template?.messageName === 'RAPPEL_X_JOURS_AVANT_ARRIVEE' || template?.messageName === 'MESSAGE_METEO_AVANT_ARRIVEE';
        const useAi = Boolean(template?.useAiMode) || isRappelX && hasAiPrompt;
        setCurrentTemplate(template);
        setAiMode(useAi);
        const initialData = {
          type: template.type || 'Message',
          content: convertTemplateToDisplay(template.content || ''),
          contentEng: convertTemplateToDisplay(template.contentEng || ''),
          whatsappContent: convertTemplateToDisplay(template.whatsappContent || ''),
          whatsappContentEng: convertTemplateToDisplay(template.whatsappContentEng || ''),
          messageName: template.messageName || 'CONFIRMATION_RESERVATION_AVEC_LIEN',
          description: template.description || template.displayLabel || '',
          enabled: template.enabled !== undefined ? template.enabled : true,
          whatsappEnabled: template.whatsappEnabled !== undefined ? template.whatsappEnabled : true,
          messageEnabled: template.messageEnabled !== undefined ? template.messageEnabled : true,
          reservation: template.reservation || {
            immediately: {
              enabled: false,
              day: '',
              hours: '',
              minutes: ''
            },
            after: {
              enabled: false,
              day: '',
              hours: '',
              minutes: ''
            }
          },
          arrivalDate: template.arrivalDate || {
            before: {
              enabled: false,
              day: '',
              hours: '',
              minutes: ''
            },
            after: {
              enabled: false,
              day: '',
              hours: '',
              minutes: ''
            }
          },
          departureDate: template.departureDate || {
            before: {
              enabled: false,
              day: '',
              hours: '',
              minutes: ''
            },
            after: {
              enabled: false,
              day: '',
              hours: '',
              minutes: ''
            }
          },
          ownerId: template.ownerId || '',
          aiPrompt: template.aiPrompt || '',
          useAiMode: template.useAiMode ?? false
        };
        setFormData(initialData);
      }
    } catch (error) {
      toast.error(t('Failed_to_fetch_template_data'));
    } finally {
      setIsLoading(false);
    }
  };
  const convertTemplateToDisplay = content => {
    const availableFields = [{
      value: '${guestName}',
      display: '[GUEST_NAME]'
    }, {
      value: '${guestFirstName}',
      display: '[GUEST_FIRST_NAME]'
    }, {
      value: '${guestLastName}',
      display: '[GUEST_LAST_NAME]'
    }, {
      value: '${guestEmail}',
      display: '[GUEST_EMAIL]'
    }, {
      value: '${phone}',
      display: '[GUEST_PHONE]'
    }, {
      value: '${guestAddress}',
      display: '[GUEST_ADDRESS]'
    }, {
      value: '${guestCity}',
      display: '[GUEST_CITY]'
    }, {
      value: '${guestCountry}',
      display: '[GUEST_COUNTRY]'
    }, {
      value: '${nationality}',
      display: '[NATIONALITY]'
    }, {
      value: '${reservationNumber}',
      display: '[RESERVATION_NUMBER]'
    }, {
      value: '${numberOfGuests}',
      display: '[NUMBER_OF_GUESTS]'
    }, {
      value: '${nights}',
      display: '[NIGHTS]'
    }, {
      value: '${arrivalDate}',
      display: '[ARRIVAL_DATE]'
    }, {
      value: '${departureDate}',
      display: '[DEPARTURE_DATE]'
    }, {
      value: '${checkInTime}',
      display: '[CHECK_IN_TIME]'
    }, {
      value: '${checkOutTime}',
      display: '[CHECK_OUT_TIME]'
    }, {
      value: '${totalPrice}',
      display: '[TOTAL_PRICE]'
    }, {
      value: '${currency}',
      display: '[CURRENCY]'
    }, {
      value: '${paymentStatus}',
      display: '[PAYMENT_STATUS]'
    }, {
      value: '${paymentMethod}',
      display: '[PAYMENT_METHOD]'
    }, {
      value: '${doorCode}',
      display: '[DOOR_CODE]'
    }, {
      value: '${listing.name}',
      display: '[LISTING_NAME]'
    }];
    let displayContent = content || '';
    availableFields.forEach(field => {
      displayContent = displayContent.replace(new RegExp(escapeRegExp(field.value), 'g'), field.display);
    });
    return displayContent;
  };
  const escapeRegExp = string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const updateFormData = useCallback(data => {
    setFormData(prevData => ({
      ...prevData,
      ...data
    }));
  }, []);
  const handleSave = () => {
    const sanitizedFormData = {
      ...formData,
      whatsappType: formData.whatsappType || "",
      content: formData.content || "",
      contentEng: formData.contentEng || "",
      whatsappContent: formData.whatsappContent || "",
      whatsappContentEng: formData.whatsappContentEng || "",
      description: formData.description || "",
      aiPrompt: formData.aiPrompt ?? "",
      useAiMode: aiMode
    };
    onSubmit(sanitizedFormData, templateIdState);
  };
  const ChangeTemplateByName = id => {
    const template = templates.find(item => item._id === id);
    if (template) {
      setTemplateIdState(id);
      const hasAiPrompt = Boolean(template?.aiPrompt && String(template.aiPrompt).trim().length > 0);
      const isRappelX = template?.messageName === 'RAPPEL_X_JOURS_AVANT_ARRIVEE' || template?.messageName === 'MESSAGE_METEO_AVANT_ARRIVEE';
      setAiMode(Boolean(template?.useAiMode) || isRappelX && hasAiPrompt);
      setCurrentTemplate(template);
      const updatedData = {
        type: template.type || 'Message',
        content: convertTemplateToDisplay(template.content || ''),
        contentEng: convertTemplateToDisplay(template.contentEng || ''),
        whatsappContent: convertTemplateToDisplay(template.whatsappContent || ''),
        whatsappContentEng: convertTemplateToDisplay(template.whatsappContentEng || ''),
        messageName: template.messageName || 'CONFIRMATION_RESERVATION_AVEC_LIEN',
        description: template.description || template.displayLabel || '',
        enabled: template.enabled !== undefined ? template.enabled : true,
        whatsappEnabled: template.whatsappEnabled !== undefined ? template.whatsappEnabled : true,
        messageEnabled: template.messageEnabled !== undefined ? template.messageEnabled : true,
        reservation: template.reservation || {
          immediately: {
            enabled: false,
            day: '',
            hours: '',
            minutes: ''
          },
          after: {
            enabled: false,
            day: '',
            hours: '',
            minutes: ''
          }
        },
        arrivalDate: template.arrivalDate || {
          before: {
            enabled: false,
            day: '',
            hours: '',
            minutes: ''
          },
          after: {
            enabled: false,
            day: '',
            hours: '',
            minutes: ''
          }
        },
        departureDate: template.departureDate || {
          before: {
            enabled: false,
            day: '',
            hours: '',
            minutes: ''
          },
          after: {
            enabled: false,
            day: '',
            hours: '',
            minutes: ''
          }
        },
        ownerId: template.ownerId || '',
        aiPrompt: template.aiPrompt || '',
        useAiMode: template.useAiMode ?? false
      };
      setFormData(updatedData);
    }
  };
  const orderedEmailNames = [{
    value: 'CONFIRMATION_RESERVATION_AVEC_LIEN',
    label: t('Confirmation & WhatsApp guest link')
  }, {
    value: 'RAPPEL_X_JOURS_AVANT_ARRIVEE',
    label: t('Your stay is approaching')
  }, {
    value: 'RAPPEL_ENREGISTREMENT_MANQUANT',
    label: t('Finalize your arrival')
  }, {
    value: 'RAPPEL_COMPLET_CLIENT',
    label: t('Complete your check-in')
  }, {
    value: 'RAPPEL_HORAIRE_MANQUANT',
    label: t('Confirm your arrival time')
  }, {
    value: 'RAPPEL_DEPART',
    label: t('Prepare for your arrival tomorrow')
  }, {
    value: 'RAPPEL_SERVICES_PENDANT_SEJOUR',
    label: t('Access services during your stay')
  }, {
    value: 'RAPPEL_ACTIONS_MANQUANTES',
    label: t('Departure scheduled for tomorrow')
  }, {
    value: 'SOLLICITATION_NOTE_ABSENTE',
    label: t('SOLLICITATION_NOTE_ABSENTE')
  }, ...emailName.filter(e => !['CONFIRMATION_RESERVATION_AVEC_LIEN', 'RAPPEL_X_JOURS_AVANT_ARRIVEE', 'RAPPEL_ENREGISTREMENT_MANQUANT', 'RAPPEL_COMPLET_CLIENT', 'RAPPEL_HORAIRE_MANQUANT', 'RAPPEL_DEPART', 'RAPPEL_SERVICES_PENDANT_SEJOUR', 'RAPPEL_ACTIONS_MANQUANTES', 'SOLLICITATION_NOTE_ABSENTE'].includes(e.value))];
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-medium-aquamarine"></div>
      </div>;
  }
  return <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 200px)'
  }}>
      <Box sx={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      backgroundColor: 'white',
      borderBottom: '2px solid #FF6B35',
      pb: 2,
      mb: 3
    }}>
        <MailTemplateTopBar templateId={templateId} templateIdState={templateIdState} ChangeTemplateByName={ChangeTemplateByName} t={t} isAdmin={isAdmin} templates={templates} owners={owners} formData={formData} setFormData={setFormData} newEmailName={orderedEmailNames} allowedTypes={allowedTypes} noWhatsappTemplates={noWhatsappTemplates} renderOwnerSelect={renderOwnerSelect} handleSave={handleSave} onCancel={onCancel} aiMode={aiMode} setAiMode={setAiMode} />
      </Box>
      <Box sx={{
      flex: 1,
      overflow: 'auto',
      px: 3
    }}>
        <div className="flex flex-col gap-8">
          <MailTemplateForm templateId={templateIdState} initialData={formData} currentTemplate={currentTemplate} onSubmit={updateFormData} onCancel={onCancel} updateFormData={updateFormData} templates={templates} owners={owners} isAdmin={isAdmin} aiMode={aiMode} />
          <ConfigureForm initialData={formData} currentTemplate={currentTemplate} onSubmit={updateFormData} onBack={() => {}} updateFormData={updateFormData} />
        </div>
      </Box>
    </Box>;
};
export default MailTemplateContainer;
