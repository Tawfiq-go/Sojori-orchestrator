import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, Tabs, Tab, Box, Typography, CircularProgress, Button, Alert, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getReservation } from '../services/serverApi.adminConfig';
import { getListingById } from '../../listing/services/serverApi.listing';
import { previewMessageTemplate } from '../services/serverApi.orchestratorConfig';
import { formatCheckoutTimeDisplay, buildCityTaxFromListingReservation, buildWhatsappLinkFromReservationNumber, messageCheckoutForPreview } from '../utils/orchestratorTemplatePreview';
import DynamicFieldButtons from './DynamicFieldButtons';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { styled } from '@mui/material/styles';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0'
};
const hasWeatherMessage = messageName => messageName === 'RAPPEL_X_JOURS_AVANT_ARRIVEE' || messageName === 'MESSAGE_METEO_AVANT_ARRIVEE';
const MailTemplateForm = ({
  templateId = null,
  initialData,
  currentTemplate,
  onSubmit,
  onCancel,
  updateFormData,
  templates,
  owners,
  isAdmin,
  aiMode = false
}) => {
  const {
    t
  } = useTranslation('common');
  const [messageContent, setMessageContent] = useState(initialData?.content || '');
  const [messageContentEng, setMessageContentEng] = useState(initialData?.contentEng || '');
  const [whatsappContent, setwhatsappContent] = useState(initialData?.whatsappContent || '');
  const [whatsappContentEng, setwhatsappContentEng] = useState(initialData?.whatsappContentEng || '');
  const [isLoading, setIsLoading] = useState(false);
  const [reservationData, setReservationData] = useState(null);
  const [aiPreviewData, setAiPreviewData] = useState(null);
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [aiPreviewError, setAiPreviewError] = useState(null);
  const [aiEditableContent, setAiEditableContent] = useState({
    content: '',
    contentEng: '',
    whatsappContent: '',
    whatsappContentEng: ''
  });
  const [aiPromptLocal, setAiPromptLocal] = useState('');
  const [originalContent, setOriginalContent] = useState(initialData?.content || '');
  const [originalContentEng, setOriginalContentEng] = useState(initialData?.contentEng || '');
  const [originalwhatsappContent, setOriginalwhatsappContent] = useState(initialData?.whatsappContent || '');
  const [originalwhatsappContentEng, setOriginalwhatsappContentEng] = useState(initialData?.whatsappContentEng || '');
  const {
    user
  } = useSelector(state => state.auth);
  const userId = user?._id;
  const admin = isAdmin || hasAdminAccess(user?.role);
  const userRole = user?.role;
  const defaultOwnerId = !admin ? userRole === 'Worker' ? user.ownerId : user._id : '';
  const [formData, setFormData] = useState({
    type: initialData?.type || 'Message',
    whatsappType: initialData?.whatsappType || '',
    content: initialData?.content || '',
    contentEng: initialData?.contentEng || '',
    whatsappContent: initialData?.whatsappContent || '',
    whatsappContentEng: initialData?.whatsappContentEng || '',
    messageName: initialData?.messageName || 'CONFIRMATION_RESERVATION_AVEC_LIEN',
    enabled: initialData?.enabled !== undefined ? initialData.enabled : true,
    whatsappEnabled: initialData?.whatsappEnabled !== undefined ? initialData.whatsappEnabled : true,
    messageEnabled: initialData?.messageEnabled !== undefined ? initialData.messageEnabled : true,
    ownerId: initialData?.ownerId || (!admin ? defaultOwnerId : '')
  });
  const isInitialMount = useRef(true);
  useEffect(() => {
    const templateData = currentTemplate || initialData;
    if (templateData && (isInitialMount.current || currentTemplate)) {
      setMessageContent(convertTemplateToDisplay(templateData?.content || ''));
      setMessageContentEng(convertTemplateToDisplay(templateData?.contentEng || ''));
      setwhatsappContent(convertTemplateToDisplay(templateData?.whatsappContent || ''));
      setwhatsappContentEng(convertTemplateToDisplay(templateData?.whatsappContentEng || ''));
      setOriginalContent(templateData?.content || '');
      setOriginalContentEng(templateData?.contentEng || '');
      setOriginalwhatsappContent(templateData?.whatsappContent || '');
      setOriginalwhatsappContentEng(templateData?.whatsappContentEng || '');
      setFormData(prev => ({
        ...prev,
        type: templateData.type || prev.type,
        whatsappType: templateData.whatsappType || prev.whatsappType,
        messageName: templateData.messageName || prev.messageName,
        enabled: templateData.enabled !== undefined ? templateData.enabled : prev.enabled,
        whatsappEnabled: templateData?.whatsappEnabled !== undefined ? templateData.whatsappEnabled : true,
        messageEnabled: templateData?.messageEnabled !== undefined ? templateData.messageEnabled : true,
        whatsappContent: templateData.whatsappContent || prev.whatsappContent,
        whatsappContentEng: templateData.whatsappContentEng || prev.whatsappContentEng,
        ownerId: templateData?.ownerId || (!admin ? defaultOwnerId : '')
      }));
      setAiPromptLocal(String(templateData?.aiPrompt ?? ''));
      isInitialMount.current = false;
    }
  }, [currentTemplate?._id]);
  useEffect(() => {
    if (initialData && (isInitialMount.current || currentTemplate)) {
      const shouldUpdateType = formData.type !== initialData.type;
      const shouldUpdateContent = initialData.type === 'Message' && (messageContent !== convertTemplateToDisplay(initialData.content || '') || messageContentEng !== convertTemplateToDisplay(initialData.contentEng || ''));
      const shouldUpdateWhatsapp = initialData.type === 'Whatsapp' && (whatsappContent !== convertTemplateToDisplay(initialData.whatsappContent || '') || whatsappContentEng !== convertTemplateToDisplay(initialData.whatsappContentEng || ''));
      if (shouldUpdateType || shouldUpdateContent || shouldUpdateWhatsapp) {
        setFormData(prev => ({
          ...prev,
          type: initialData.type,
          messageName: initialData.messageName,
          enabled: initialData.enabled,
          whatsappEnabled: initialData.whatsappEnabled,
          messageEnabled: initialData.messageEnabled,
          ownerId: initialData.ownerId
        }));
        if (shouldUpdateType) {
          setLangTab(0);
        }
        if (initialData.type === 'Message') {
          setMessageContent(convertTemplateToDisplay(initialData.content || ''));
          setMessageContentEng(convertTemplateToDisplay(initialData.contentEng || ''));
        } else if (initialData.type === 'Whatsapp') {
          setwhatsappContent(convertTemplateToDisplay(initialData.whatsappContent || ''));
          setwhatsappContentEng(convertTemplateToDisplay(initialData.whatsappContentEng || ''));
        }
      }
    }
  }, [initialData?.type, initialData?.content, initialData?.contentEng, initialData?.whatsappContent, initialData?.whatsappContentEng, initialData?.messageName, initialData?.enabled, initialData?.whatsappEnabled, initialData?.messageEnabled, initialData?.ownerId, currentTemplate?._id]);
  const [aiPreviewCity, setAiPreviewCity] = useState('Casablanca');
  const fetchAiPreview = () => {
    const msgName = formData?.messageName || initialData?.messageName;
    if (!hasWeatherMessage(msgName)) {
      return;
    }
    setAiPreviewLoading(true);
    setAiPreviewError(null);
    const tid = templateId || msgName;
    previewMessageTemplate({
      templateId: tid,
      mode: 'ai',
      city: aiPreviewCity,
      reservation: reservationData,
      aiPrompt: aiPromptLocal || currentTemplate?.aiPrompt || initialData?.aiPrompt || ''
    }).then(res => {
      if (res?.success && res?.data) {
        setAiPreviewData(res.data);
        setAiPreviewError(null);
        setAiEditableContent({
          content: res.data?.content || '',
          contentEng: res.data?.contentEng || '',
          whatsappContent: res.data?.whatsappContent || '',
          whatsappContentEng: res.data?.whatsappContentEng || ''
        });
      } else {
        setAiPreviewError(res?.error || 'Réponse invalide du serveur');
        setAiPreviewData(null);
      }
    }).catch(err => {
      const msg = err?.response?.data?.error || err?.message || 'Erreur réseau lors du preview AI';
      setAiPreviewError(msg);
      setAiPreviewData(null);
    }).finally(() => setAiPreviewLoading(false));
  };
  useEffect(() => {
    if (!aiMode) {
      setAiPreviewData(null);
      setAiPreviewError(null);
      setAiEditableContent({
        content: '',
        contentEng: '',
        whatsappContent: '',
        whatsappContentEng: ''
      });
    } else {
      const src = currentTemplate?.aiPrompt ?? initialData?.aiPrompt ?? '';
      if (src && !aiPromptLocal) setAiPromptLocal(String(src));
    }
  }, [aiMode]);
  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {}).catch(() => {});
  };
  const applyAiToTemplate = (field, value) => {
    if (field === 'content') {
      setMessageContent(value);
      updateFormData({
        content: value
      });
    } else if (field === 'contentEng') {
      setMessageContentEng(value);
      updateFormData({
        contentEng: value
      });
    } else if (field === 'whatsappContent') {
      setwhatsappContent(value);
      updateFormData({
        whatsappContent: value
      });
    } else if (field === 'whatsappContentEng') {
      setwhatsappContentEng(value);
      updateFormData({
        whatsappContentEng: value
      });
    }
  };
  const emailName = [
  // { value: 'CONFIRMATION_RESERVATION_STANDARD', label: t('CONFIRMATION_RESERVATION_STANDARD') },
  {
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
  },
  // { value: 'REMERCIEMENT_REVIEW_POSITIF', label: t('REMERCIEMENT_REVIEW_POSITIF') },
  // { value: 'REMERCIMENT_REVIEW_NEGATIF', label: t('REMERCIMENT_REVIEW_NEGATIF') },
  {
    value: 'SOLLICITATION_NOTE_ABSENTE',
    label: t('SOLLICITATION_NOTE_ABSENTE')
  }];
  const noWhatsappTemplates = ['CONFIRMATION_RESERVATION_STANDARD', 'CONFIRMATION_RESERVATION_AVEC_LIEN', 'RAPPEL_7_JOURS_AVANT_ARRIVEE', 'RAPPEL_X_JOURS_AVANT_ARRIVEE'];
  // const templateNames = new Set(templates.map(t => t.messageName));
  // const newEmailName = emailName.filter(item => !templateNames.has(item.value));
  const newEmailName = emailName;
  const emailTypes = [{
    value: 'Message',
    label: t('Message')
  }, {
    value: 'Whatsapp',
    label: t('Whatsapp')
  }];
  useEffect(() => {
    if (!isInitialMount.current) {
      updateFormData({
        type: formData.type,
        content: messageContent,
        contentEng: messageContentEng,
        whatsappContent: whatsappContent,
        whatsappContentEng: whatsappContentEng,
        messageName: formData.messageName,
        enabled: formData.enabled,
        messageEnabled: formData.messageEnabled,
        whatsappEnabled: formData.whatsappEnabled,
        ownerId: formData.ownerId
      });
    }
  }, [formData.type, messageContent, messageContentEng, formData.messageName, formData.enabled, whatsappContent, whatsappContentEng, formData.messageEnabled, formData.whatsappEnabled, formData.ownerId, updateFormData]);
  const availableFields = [{
    label: t('Guest Full Name'),
    value: '${guestName}',
    display: '[GUEST_NAME]'
  }, {
    label: t('Guest First Name'),
    value: '${guestFirstName}',
    display: '[GUEST_FIRST_NAME]'
  }, {
    label: t('Guest Last Name'),
    value: '${guestLastName}',
    display: '[GUEST_LAST_NAME]'
  }, {
    label: t('Guest Email'),
    value: '${guestEmail}',
    display: '[GUEST_EMAIL]'
  }, {
    label: t('Guest Phone'),
    value: '${phone}',
    display: '[GUEST_PHONE]'
  }, {
    label: t('Guest Address'),
    value: '${guestAddress}',
    display: '[GUEST_ADDRESS]'
  }, {
    label: t('Guest City'),
    value: '${guestCity}',
    display: '[GUEST_CITY]'
  }, {
    label: t('Guest Country'),
    value: '${guestCountry}',
    display: '[GUEST_COUNTRY]'
  }, {
    label: t('Nationality'),
    value: '${nationality}',
    display: '[NATIONALITY]'
  }, {
    label: t('Reservation Number'),
    value: '${reservationNumber}',
    display: '[RESERVATION_NUMBER]'
  }, {
    label: t('Number of Guests'),
    value: '${numberOfGuests}',
    display: '[NUMBER_OF_GUESTS]'
  }, {
    label: t('Number of Adults'),
    value: '${adults}',
    display: '[ADULTS]'
  }, {
    label: t('Number of Nights'),
    value: '${nights}',
    display: '[NIGHTS]'
  }, {
    label: t('Arrival Date'),
    value: '${arrivalDate}',
    display: '[ARRIVAL_DATE]'
  }, {
    label: t('Departure Date'),
    value: '${departureDate}',
    display: '[DEPARTURE_DATE]'
  }, {
    label: t('Check-in Time'),
    value: '${checkInTime}',
    display: '[CHECK_IN_TIME]'
  }, {
    label: t('Check-out Time'),
    value: '${checkOutTime}',
    display: '[CHECK_OUT_TIME]'
  }, {
    label: t('Total Price'),
    value: '${totalPrice}',
    display: '[TOTAL_PRICE]'
  }, {
    label: t('Currency'),
    value: '${currency}',
    display: '[CURRENCY]'
  }, {
    label: t('Payment Status'),
    value: '${paymentStatus}',
    display: '[PAYMENT_STATUS]'
  }, {
    label: t('Payment Method'),
    value: '${paymentMethod}',
    display: '[PAYMENT_METHOD]'
  }, {
    label: t('Door Code'),
    value: '${doorCode}',
    display: '[DOOR_CODE]'
  }, {
    label: t('Listing Name'),
    value: '${listing.name}',
    display: '[LISTING_NAME]'
  }, {
    label: t('Checkout Instructions'),
    value: '${messageCheckout}',
    display: '[MESSAGE_CHECKOUT]'
  }, {
    label: t('City Tax Per Adult Per Night'),
    value: '${cityTaxPerAdultPerNight}',
    display: '[CITY_TAX_PER_ADULT]'
  }, {
    label: t('City Tax Total'),
    value: '${cityTax}',
    display: '[CITY_TAX]'
  }];
  useEffect(() => {
    fetchReservationData();
  }, []);
  const convertTemplateToDisplay = content => {
    let displayContent = content || '';
    availableFields.forEach(field => {
      displayContent = displayContent.replace(new RegExp(escapeRegExp(field.value), 'g'), field.display);
    });
    return displayContent;
  };
  const convertDisplayToTemplate = content => {
    let templateContent = content || '';
    availableFields.forEach(field => {
      templateContent = templateContent.replace(new RegExp(escapeRegExp(field.display), 'g'), field.value);
    });
    return templateContent;
  };
  const fetchReservationData = async () => {
    try {
      const response = await getReservation(1, 0);
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const reservation = response.data.data[0];

        // Enrichir avec les données du listing (messageCheckout, cityTax, etc.)
        if (reservation.listingId || reservation.listing?._id) {
          try {
            const listingId = reservation.listingId || reservation.listing._id;
            const fullListing = await getListingById(listingId);
            if (fullListing) {
              // Enrichir la réservation avec toutes les données du listing
              reservation.listing = {
                ...reservation.listing,
                ...fullListing
              };
            } else {}
          } catch (listingError) {}
        }
        setReservationData(reservation);
      } else {
        setReservationData({
          guestName: 'Isabella Rodriguez',
          guestFirstName: 'Isabella',
          guestLastName: 'Rodriguez',
          guestEmail: 'isabella.rodriguez@email.com',
          phone: '+34 612 345 678',
          guestAddress: 'Calle Gran Vía 45, 3ºB',
          guestCity: 'Madrid',
          guestCountry: 'Spain',
          nationality: 'Spanish',
          reservationNumber: 'RES-2026-001',
          numberOfGuests: 3,
          adults: 2,
          nights: 5,
          arrivalDate: new Date().toISOString(),
          departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          checkInTime: '16:00',
          checkOutTime: '10:00',
          totalPrice: 450,
          currency: 'EUR',
          paymentStatus: 'Paid',
          paymentMethod: 'Cash',
          doorCode: '7892',
          listing: {
            name: 'Luxury Downtown Loft',
            city: 'Marrakech',
            address: 'Rue de la Kasbah, Marrakech',
            messageCheckout: ['• Vider le réfrigérateur\n• Fermer toutes les fenêtres\n• Éteindre les lumières et le chauffage\n• Déposer les clés dans la boîte à clés'],
            cityTaxEnabled: true,
            cityTaxPerAdultPerNight: 3.5
          }
        });
      }
    } catch (error) {
      setReservationData({
        guestName: 'Isabella Rodriguez',
        guestFirstName: 'Isabella',
        guestLastName: 'Rodriguez',
        guestEmail: 'isabella.rodriguez@email.com',
        phone: '+34 612 345 678',
        guestAddress: 'Calle Gran Vía 45, 3ºB',
        guestCity: 'Madrid',
        guestCountry: 'Spain',
        nationality: 'Spanish',
        reservationNumber: 'RES-2024-001',
        numberOfGuests: 3,
        adults: 2,
        nights: 5,
        arrivalDate: new Date().toISOString(),
        departureDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        checkInTime: '16:00',
        checkOutTime: '10:00',
        totalPrice: 450,
        currency: 'EUR',
        paymentStatus: 'Paid',
        paymentMethod: 'PayPal',
        doorCode: '7892',
        listing: {
          name: 'Luxury Downtown Loft',
          city: 'Marrakech',
          address: 'Rue de la Kasbah, Marrakech',
          messageCheckout: ['• Vider le réfrigérateur\n• Fermer toutes les fenêtres\n• Éteindre les lumières et le chauffage\n• Déposer les clés dans la boîte à clés'],
          cityTaxEnabled: true,
          cityTaxPerAdultPerNight: 3.5
        }
      });
    }
  };
  const insertField = (field, isEnglish = false) => {
    const textarea = isEnglish ? document.querySelector('textarea[name="contentEng"]') : document.querySelector('textarea[name="content"]');
    const currentContent = isEnglish ? messageContentEng : messageContent;
    const cursorPosition = textarea?.selectionStart || currentContent.length;
    const textBeforeCursor = currentContent.slice(0, cursorPosition);
    const needsSpace = cursorPosition > 0 && textBeforeCursor.slice(-1) !== ' ' && textBeforeCursor.slice(-1) !== '\n';
    const fieldToInsert = needsSpace ? ` ${field.display}` : field.display;
    const newContent = currentContent.slice(0, cursorPosition) + fieldToInsert + currentContent.slice(cursorPosition);
    if (isEnglish) {
      setMessageContentEng(newContent);
    } else {
      setMessageContent(newContent);
    }
  };
  const insertFieldWhatsapp = (field, isEnglish = false) => {
    const textarea = isEnglish ? document.querySelector('textarea[name="whatsappContentEng"]') : document.querySelector('textarea[name="whatsappContent"]');
    const currentContent = isEnglish ? whatsappContentEng : whatsappContent;
    const cursorPosition = textarea?.selectionStart || currentContent.length;
    const textBeforeCursor = currentContent.slice(0, cursorPosition);
    const needsSpace = cursorPosition > 0 && textBeforeCursor.slice(-1) !== ' ' && textBeforeCursor.slice(-1) !== '\n';
    const fieldToInsert = needsSpace ? ` ${field.display}` : field.display;
    const newContent = currentContent.slice(0, cursorPosition) + fieldToInsert + currentContent.slice(cursorPosition);
    if (isEnglish) {
      setwhatsappContentEng(newContent);
    } else {
      setwhatsappContent(newContent);
    }
  };
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc ? acc[key] : '', obj);
  };
  const getPreviewContent = (isEnglish = false) => {
    const currentContent = isEnglish ? messageContentEng : messageContent;
    if (!currentContent) return '';
    let previewContent = currentContent;

    // Replace {fieldName} format with real reservation data or sample data
    if (reservationData) {
      previewContent = previewContent.replace(/\{(\w+)\}/g, (match, fieldName) => {
        // Map common field names to reservation object paths
        const fieldMap = {
          firstName: reservationData.guestFirstName,
          lastName: reservationData.guestLastName,
          listingName: reservationData.listing?.name,
          arrivalDate: reservationData.arrivalDate ? new Date(reservationData.arrivalDate).toLocaleDateString('fr-FR') : '',
          departureDate: reservationData.departureDate ? new Date(reservationData.departureDate).toLocaleDateString('fr-FR') : '',
          reservationNumber: reservationData.reservationNumber,
          guestEmail: reservationData.guestEmail,
          totalPrice: reservationData.totalPrice ? `${reservationData.totalPrice}${reservationData.currency || '€'}` : '',
          numberOfGuests: reservationData.numberOfGuests,
          adults: reservationData.adults || reservationData.numberOfGuests || 1,
          // Time-related fields
          arrivalTime: reservationData.confirmedCheckInTime || '15:00',
          checkoutTime: formatCheckoutTimeDisplay(reservationData.checkOutTime ?? reservationData.listing?.checkOutTime ?? reservationData.confirmedCheckOutTime),
          checkinHours: '15:00',
          // Location fields
          city: reservationData.listing?.city || 'Marrakech',
          address: reservationData.listing?.address || 'Rue de la Kasbah, Marrakech',
          // Platform and review
          platformName: reservationData.platformName || reservationData.channelName || 'Airbnb',
          reviewLink: (() => {
            const platform = reservationData.platformName || reservationData.channelName || 'Airbnb';
            const links = {
              'Airbnb': 'https://www.airbnb.com/review',
              'BookingCom': 'https://www.booking.com/reviewsubmit',
              'Booking': 'https://www.booking.com/reviewsubmit',
              'Booking.com': 'https://www.booking.com/reviewsubmit'
            };
            return links[platform] || 'https://www.airbnb.com/review';
          })(),
          // Weather data (sample for preview - real data comes from backend)
          weatherTemp: '15°C - 25°C (moyenne: 20°C)',
          weatherConditions: 'Ciel dégagé',
          weatherRecommendations: '→ Crème solaire recommandée\n→ Lunettes de soleil\n→ Vêtements légers pour la journée\n→ Une veste légère pour les soirées',
          // AI-generated recommendations (sample for preview)
          activityRecommendations: '→ Visite des Jardins Majorelle\n→ Découverte de la Médina\n→ Soirée au Jemaa el-Fna',
          restaurantRecommendations: '→ Le Jardin (cuisine marocaine moderne)\n→ Nomad (rooftop avec vue)\n→ Café des Épices',
          shopRecommendations: '→ Souk Semmarine (artisanat)\n→ Ensemble Artisanal (prix fixes)\n→ 33 Rue Majorelle (boutiques design)',
          transportInfo: '→ Taxi de l\'aéroport : 70-100 MAD\n→ Bus n°19 : 30 MAD\n→ Grand Taxi partagé : 20 MAD/personne',
          // Checkout instructions and city tax (toutes les entrées messageCheckout[], comme l’orchestrateur)
          messageCheckout: messageCheckoutForPreview(reservationData.listing, reservationData),
          cityTaxPerAdultPerNight: reservationData.listing?.cityTaxPerAdultPerNight || 0,
          cityTax: buildCityTaxFromListingReservation(reservationData.listing, reservationData),
          whatsappLink: buildWhatsappLinkFromReservationNumber(reservationData.reservationNumber, reservationData.language || reservationData.guestLanguage || 'fr')
        };
        return fieldMap[fieldName] || reservationData[fieldName] || match;
      });
    } else {
      // Fallback to sample data if no reservation loaded
      const sampleData = {
        firstName: 'Mohammed',
        lastName: 'Alami',
        listingName: 'Appartement Centre Marrakech',
        arrivalDate: '15/01/2026',
        departureDate: '20/01/2026',
        reservationNumber: 'SJ-ABC12345',
        guestEmail: 'mohammed.alami@example.com',
        totalPrice: '850€',
        numberOfGuests: '4',
        adults: '3',
        // Time-related fields
        arrivalTime: '15:00',
        checkoutTime: '11:00',
        checkinHours: '15:00',
        // Location fields
        city: 'Marrakech',
        address: 'Rue de la Kasbah, Marrakech',
        // Platform and review
        platformName: 'Airbnb',
        reviewLink: 'https://www.airbnb.com/review',
        // Weather data (sample for preview)
        weatherTemp: '15°C - 25°C (moyenne: 20°C)',
        weatherConditions: 'Ciel dégagé',
        weatherRecommendations: '→ Crème solaire recommandée\n→ Lunettes de soleil\n→ Vêtements légers pour la journée\n→ Une veste légère pour les soirées',
        // AI-generated recommendations (sample for preview)
        activityRecommendations: '→ Visite des Jardins Majorelle\n→ Découverte de la Médina\n→ Soirée au Jemaa el-Fna',
        restaurantRecommendations: '→ Le Jardin (cuisine marocaine moderne)\n→ Nomad (rooftop avec vue)\n→ Café des Épices',
        shopRecommendations: '→ Souk Semmarine (artisanat)\n→ Ensemble Artisanal (prix fixes)\n→ 33 Rue Majorelle (boutiques design)',
        transportInfo: '→ Taxi de l\'aéroport : 70-100 MAD\n→ Bus n°19 : 30 MAD\n→ Grand Taxi partagé : 20 MAD/personne',
        // Checkout instructions and city tax
        messageCheckout: '• Vider le réfrigérateur\n• Fermer toutes les fenêtres\n• Éteindre les lumières et le chauffage\n• Déposer les clés dans la boîte à clés',
        cityTaxPerAdultPerNight: '3.50',
        cityTax: '52.50 MAD',
        whatsappLink: buildWhatsappLinkFromReservationNumber('SJ-ABC12345', 'fr')
      };
      previewContent = previewContent.replace(/\{(\w+)\}/g, (match, fieldName) => {
        return sampleData[fieldName] || match;
      });
    }
    if (reservationData) {
      availableFields.forEach(field => {
        const fieldPath = field.value.slice(2, -1);
        const value = field.display === '[ARRIVAL_DATE]' || field.display === '[DEPARTURE_DATE]' ? new Date(getNestedValue(reservationData, fieldPath)).toLocaleDateString() : getNestedValue(reservationData, fieldPath) || '';
        previewContent = previewContent.replace(new RegExp(escapeRegExp(field.display), 'g'), String(value));
      });
    } else {
      availableFields.forEach(field => {
        const placeholderValue = field.display === '[ARRIVAL_DATE]' || field.display === '[DEPARTURE_DATE]' ? '[DATE_PLACEHOLDER]' : `[${field.display.slice(1, -1)}_PLACEHOLDER]`;
        previewContent = previewContent.replace(new RegExp(escapeRegExp(field.display), 'g'), placeholderValue);
      });
    }
    return previewContent;
  };
  const getPreviewwhatsappContent = (isEnglish = false) => {
    const currentContent = isEnglish ? whatsappContentEng : whatsappContent;
    if (!currentContent) return '';
    let previewContent = currentContent;

    // Replace {fieldName} format with real reservation data or sample data
    if (reservationData) {
      previewContent = previewContent.replace(/\{(\w+)\}/g, (match, fieldName) => {
        // Map common field names to reservation object paths
        const fieldMap = {
          firstName: reservationData.guestFirstName,
          lastName: reservationData.guestLastName,
          listingName: reservationData.listing?.name,
          arrivalDate: reservationData.arrivalDate ? new Date(reservationData.arrivalDate).toLocaleDateString('fr-FR') : '',
          departureDate: reservationData.departureDate ? new Date(reservationData.departureDate).toLocaleDateString('fr-FR') : '',
          reservationNumber: reservationData.reservationNumber,
          guestEmail: reservationData.guestEmail,
          totalPrice: reservationData.totalPrice ? `${reservationData.totalPrice}${reservationData.currency || '€'}` : '',
          numberOfGuests: reservationData.numberOfGuests,
          adults: reservationData.adults || reservationData.numberOfGuests || 1,
          // Time-related fields
          arrivalTime: reservationData.confirmedCheckInTime || '15:00',
          checkoutTime: formatCheckoutTimeDisplay(reservationData.checkOutTime ?? reservationData.listing?.checkOutTime ?? reservationData.confirmedCheckOutTime),
          checkinHours: '15:00',
          // Location fields
          city: reservationData.listing?.city || 'Marrakech',
          address: reservationData.listing?.address || 'Rue de la Kasbah, Marrakech',
          // Platform and review
          platformName: reservationData.platformName || reservationData.channelName || 'Airbnb',
          reviewLink: (() => {
            const platform = reservationData.platformName || reservationData.channelName || 'Airbnb';
            const links = {
              'Airbnb': 'https://www.airbnb.com/review',
              'BookingCom': 'https://www.booking.com/reviewsubmit',
              'Booking': 'https://www.booking.com/reviewsubmit',
              'Booking.com': 'https://www.booking.com/reviewsubmit'
            };
            return links[platform] || 'https://www.airbnb.com/review';
          })(),
          // Weather data (sample for preview - real data comes from backend)
          weatherTemp: '15°C - 25°C (moyenne: 20°C)',
          weatherConditions: 'Ciel dégagé',
          weatherRecommendations: '→ Crème solaire recommandée\n→ Lunettes de soleil\n→ Vêtements légers pour la journée\n→ Une veste légère pour les soirées',
          // AI-generated recommendations (sample for preview)
          activityRecommendations: '→ Visite des Jardins Majorelle\n→ Découverte de la Médina\n→ Soirée au Jemaa el-Fna',
          restaurantRecommendations: '→ Le Jardin (cuisine marocaine moderne)\n→ Nomad (rooftop avec vue)\n→ Café des Épices',
          shopRecommendations: '→ Souk Semmarine (artisanat)\n→ Ensemble Artisanal (prix fixes)\n→ 33 Rue Majorelle (boutiques design)',
          transportInfo: '→ Taxi de l\'aéroport : 70-100 MAD\n→ Bus n°19 : 30 MAD\n→ Grand Taxi partagé : 20 MAD/personne',
          // Checkout instructions and city tax (toutes les entrées messageCheckout[], comme l’orchestrateur)
          messageCheckout: messageCheckoutForPreview(reservationData.listing, reservationData),
          cityTaxPerAdultPerNight: reservationData.listing?.cityTaxPerAdultPerNight || 0,
          cityTax: buildCityTaxFromListingReservation(reservationData.listing, reservationData),
          whatsappLink: buildWhatsappLinkFromReservationNumber(reservationData.reservationNumber, reservationData.language || reservationData.guestLanguage || 'fr')
        };
        return fieldMap[fieldName] || reservationData[fieldName] || match;
      });
    } else {
      // Fallback to sample data if no reservation loaded
      const sampleData = {
        firstName: 'Mohammed',
        lastName: 'Alami',
        listingName: 'Appartement Centre Marrakech',
        arrivalDate: '15/01/2026',
        departureDate: '20/01/2026',
        reservationNumber: 'SJ-ABC12345',
        guestEmail: 'mohammed.alami@example.com',
        totalPrice: '850€',
        numberOfGuests: '4',
        adults: '3',
        // Time-related fields
        arrivalTime: '15:00',
        checkoutTime: '11:00',
        checkinHours: '15:00',
        // Location fields
        city: 'Marrakech',
        address: 'Rue de la Kasbah, Marrakech',
        // Platform and review
        platformName: 'Airbnb',
        reviewLink: 'https://www.airbnb.com/review',
        // Weather data (sample for preview)
        weatherTemp: '15°C - 25°C (moyenne: 20°C)',
        weatherConditions: 'Ciel dégagé',
        weatherRecommendations: '→ Crème solaire recommandée\n→ Lunettes de soleil\n→ Vêtements légers pour la journée\n→ Une veste légère pour les soirées',
        // AI-generated recommendations (sample for preview)
        activityRecommendations: '→ Visite des Jardins Majorelle\n→ Découverte de la Médina\n→ Soirée au Jemaa el-Fna',
        restaurantRecommendations: '→ Le Jardin (cuisine marocaine moderne)\n→ Nomad (rooftop avec vue)\n→ Café des Épices',
        shopRecommendations: '→ Souk Semmarine (artisanat)\n→ Ensemble Artisanal (prix fixes)\n→ 33 Rue Majorelle (boutiques design)',
        transportInfo: '→ Taxi de l\'aéroport : 70-100 MAD\n→ Bus n°19 : 30 MAD\n→ Grand Taxi partagé : 20 MAD/personne',
        // Checkout instructions and city tax
        messageCheckout: '• Vider le réfrigérateur\n• Fermer toutes les fenêtres\n• Éteindre les lumières et le chauffage\n• Déposer les clés dans la boîte à clés',
        cityTaxPerAdultPerNight: '3.50',
        cityTax: '52.50 MAD',
        whatsappLink: buildWhatsappLinkFromReservationNumber('SJ-ABC12345', 'fr')
      };
      previewContent = previewContent.replace(/\{(\w+)\}/g, (match, fieldName) => {
        return sampleData[fieldName] || match;
      });
    }
    if (reservationData) {
      availableFields.forEach(field => {
        const fieldPath = field.value.slice(2, -1);
        const value = field.display === '[ARRIVAL_DATE]' || field.display === '[DEPARTURE_DATE]' ? new Date(getNestedValue(reservationData, fieldPath)).toLocaleDateString() : getNestedValue(reservationData, fieldPath) || '';
        previewContent = previewContent.replace(new RegExp(escapeRegExp(field.display), 'g'), String(value));
      });
    } else {
      availableFields.forEach(field => {
        const placeholderValue = field.display === '[ARRIVAL_DATE]' || field.display === '[DEPARTURE_DATE]' ? '[DATE_PLACEHOLDER]' : `[${field.display.slice(1, -1)}_PLACEHOLDER]`;
        previewContent = previewContent.replace(new RegExp(escapeRegExp(field.display), 'g'), placeholderValue);
      });
    }
    return previewContent;
  };
  const escapeRegExp = string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  const allowedTypes = noWhatsappTemplates.includes(formData.messageName) ? [{
    value: 'Message',
    label: t('Message')
  }] : emailTypes;
  const handleSubmit = () => {
    const templateContent = convertDisplayToTemplate(messageContent);
    const templateContentEng = convertDisplayToTemplate(messageContentEng);
    const templatewhatsappContent = whatsappContent ? convertDisplayToTemplate(whatsappContent) : "";
    const templatewhatsappContentEng = whatsappContentEng ? convertDisplayToTemplate(whatsappContentEng) : "";
    const finalType = formData.type;
    const finalWhatsappType = formData.type === 'Whatsapp' ? 'Whatsapp' : '';
    const sanitizedData = {
      ...formData,
      type: finalType,
      whatsappType: finalWhatsappType || "",
      content: templateContent || "",
      contentEng: templateContentEng || "",
      whatsappContent: templatewhatsappContent || "",
      whatsappContentEng: templatewhatsappContentEng || "",
      enabled: formData.enabled,
      whatsappEnabled: formData.whatsappEnabled,
      messageEnabled: formData.messageEnabled,
      ownerId: formData.ownerId || ""
    };
    onSubmit(sanitizedData);
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-medium-aquamarine"></div>
            </div>;
  }

  // useEffect(() => {
  // }, [templateId]);

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
  const [langTab, setLangTab] = useState(0);
  const StyledTabs = styled(Tabs)(({
    theme
  }) => ({
    minHeight: 36,
    '& .MuiTabs-flexContainer': {
      borderBottom: '2px solid #e0e0e0',
      minHeight: 36
    },
    '& .MuiTab-root': {
      minWidth: 120,
      minHeight: 36,
      fontWeight: 600,
      color: '#888',
      fontSize: '1rem',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      padding: '0 24px'
    },
    '& .Mui-selected': {
      color: '#00b4b4 !important',
      fontWeight: 700
    },
    '& .MuiTabs-indicator': {
      backgroundColor: '#00b4b4',
      height: 3,
      borderRadius: 2,
      left: 0,
      width: 120,
      transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)'
    }
  }));
  const StyledTab = styled(Tab)({
    minWidth: 120,
    minHeight: 36,
    fontWeight: 600,
    color: '#888',
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: '0 24px',
    '&.Mui-selected': {
      color: SOJORI_COLORS.primary,
      fontWeight: 700
    }
  });
  const isAiView = aiMode && hasWeatherMessage(formData.messageName);
  const showMenageVariablesHint = String(formData?.messageName || '').includes('MENAGE');
  return <div>
            <Card className="shadow-none !p-0 rounded-0 ">
                <CardContent className="!p-0">
                    {/* Mode AI : bloc prompt éditable + variables disponibles + Aperçu */}
                    {isAiView && <div className="mb-6">
                            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2
          }}>
                                <Typography variant="h6" sx={{
              color: '#616161',
              fontWeight: 600
            }}>🤖 Mode AI — Prompt + Aperçu</Typography>
                                <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
                                    <input type="text" placeholder="Ville" value={aiPreviewCity} onChange={e => setAiPreviewCity(e.target.value)} className="!px-2 !py-1.5 border rounded !text-sm" style={{
                width: 140
              }} />
                                    <Button variant="contained" size="small" startIcon={<RefreshIcon />} onClick={fetchAiPreview} disabled={aiPreviewLoading} sx={{
                bgcolor: SOJORI_COLORS.primary
              }}>{aiPreviewLoading ? '...' : 'Preview'}</Button>
                                    {aiPreviewData?.aiProvider && <Typography variant="caption" color="text.secondary">({aiPreviewData.aiProvider})</Typography>}
                                </Box>
                            </Box>
                            {aiPreviewError && !aiPreviewData && <Alert severity="error" sx={{
            mb: 2
          }}>{aiPreviewError}</Alert>}
                            <Card sx={{
            p: 3,
            mb: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 2
          }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{
              mb: 1
            }}>Variables (cliquer pour insérer)</Typography>
                                <Box sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
              mb: 2
            }}>
                                    {['listingName', 'city', 'arrivalDate', 'departureDate', 'arrivalTimeChosen', 'adults', 'adultsRegistered', 'adultsPending', 'weatherTemp', 'weatherConditions', 'weatherRecommendations', 'whatsappLink', 'reservationNumber'].map(key => <button key={key} type="button" onClick={() => {
                const ta = document.querySelector('textarea[name="aiPrompt"]');
                const pos = ta?.selectionStart ?? aiPromptLocal.length;
                const before = aiPromptLocal.slice(0, pos);
                const after = aiPromptLocal.slice(pos);
                const next = before + `{${key}}` + after;
                setAiPromptLocal(next);
                updateFormData({
                  aiPrompt: next
                });
              }} className="!px-2 !py-1 !text-xs !rounded !border !border-gray-200 !bg-gray-50 hover:!bg-gray-100">{'{' + key + '}'}</button>)}
                                </Box>
                                <Typography variant="subtitle2" color="text.secondary" sx={{
              mb: 1
            }}>Prompt (éditable)</Typography>
                                <textarea name="aiPrompt" value={aiPromptLocal} onChange={e => {
              const v = e.target.value;
              setAiPromptLocal(v);
              updateFormData({
                aiPrompt: v
              });
            }} placeholder="Tu vas créer un message de rappel... (effaçable, collable)" className="w-full p-3 border rounded min-h-[120px] !text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-y" style={{
              whiteSpace: 'pre-wrap'
            }} />
                                {aiPreviewData?.aiError && !aiPreviewError && <Alert severity="warning" sx={{
              mt: 2
            }}>{aiPreviewData.aiError}{aiPreviewData.aiRawPreview && <Box component="pre" sx={{
                mt: 1,
                fontSize: '0.7rem',
                overflow: 'auto',
                maxHeight: 80
              }}>{aiPreviewData.aiRawPreview}</Box>}</Alert>}
                            </Card>
                            {aiPreviewData && <Card sx={{
            p: 3,
            border: aiPreviewData.aiError ? '2px solid #ed6c02' : '1px solid #e0e0e0',
            borderRadius: 2,
            bgcolor: aiPreviewData.aiError ? '#fff8e1' : undefined
          }}>
                                    {aiPreviewData.aiError && <Alert severity="warning" sx={{
              mb: 2
            }}>
                                            ⚠️ Erreur IA — les blocs affichent l&apos;erreur au lieu des messages
                                        </Alert>}
                                    <Typography variant="subtitle2" sx={{
              mb: 2
            }}>{aiPreviewData.aiError ? 'Erreurs' : 'Les 4 versions — éditable, copiable'}</Typography>
                                    <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 3
            }}>
                                        {[{
                key: 'content',
                label: 'Message FR',
                value: aiEditableContent.content,
                setter: v => setAiEditableContent(p => ({
                  ...p,
                  content: v
                }))
              }, {
                key: 'contentEng',
                label: 'Message EN',
                value: aiEditableContent.contentEng,
                setter: v => setAiEditableContent(p => ({
                  ...p,
                  contentEng: v
                }))
              }, {
                key: 'whatsappContent',
                label: 'WhatsApp FR',
                value: aiEditableContent.whatsappContent,
                setter: v => setAiEditableContent(p => ({
                  ...p,
                  whatsappContent: v
                }))
              }, {
                key: 'whatsappContentEng',
                label: 'WhatsApp EN',
                value: aiEditableContent.whatsappContentEng,
                setter: v => setAiEditableContent(p => ({
                  ...p,
                  whatsappContentEng: v
                }))
              }].map(({
                key,
                label,
                value,
                setter
              }) => <Box key={key}>
                                                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1
                }}>
                                                    <Typography variant="subtitle2" sx={{
                    fontWeight: 600,
                    color: '#333'
                  }}>{label}</Typography>
                                                    <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}>
                                                        <Tooltip title="Copier">
                                                            <IconButton size="small" onClick={() => copyToClipboard(value, label)} sx={{
                        p: 0.75,
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        color: '#555',
                        '&:hover': {
                          bgcolor: '#f5f5f5',
                          color: SOJORI_COLORS.primary
                        }
                      }}>
                                                                <ContentCopyIcon sx={{
                          fontSize: 18
                        }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Button size="small" variant="outlined" sx={{
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.75rem',
                      borderColor: SOJORI_COLORS.primary,
                      color: SOJORI_COLORS.primary,
                      '&:hover': {
                        borderColor: SOJORI_COLORS.primaryDark,
                        bgcolor: SOJORI_COLORS.primaryPale
                      }
                    }} onClick={() => applyAiToTemplate(key, value)}>Appliquer</Button>
                                                    </Box>
                                                </Box>
                                                <textarea value={value} onChange={e => setter(e.target.value)} className="w-full p-2 border rounded text-sm font-sans resize-y focus:outline-none focus:ring-2 focus:ring-orange-400" style={{
                  minHeight: 180,
                  maxHeight: 320,
                  whiteSpace: 'pre-wrap'
                }} spellCheck={false} />
                                            </Box>)}
                                    </Box>
                                </Card>}
                        </div>}

                    <div className="mb-6">
                        {!isAiView && (formData.type === 'Message' || formData.type !== 'Whatsapp') && <div>
                                {showMenageVariablesHint && <Alert severity="info" sx={{
              mb: 2
            }} icon={false}>
                                        <Typography variant="subtitle2" sx={{
                fontWeight: 600,
                mb: 0.75
              }}>
                                            Ménage : variables « jour » (orchestrateur — accolades simples {'{ }'})
                                        </Typography>
                                        <Typography component="div" variant="body2" sx={{
                lineHeight: 1.65,
                '& code': {
                  fontSize: '0.8rem',
                  bgcolor: '#f0f4f8',
                  px: 0.4,
                  borderRadius: 0.5
                }
              }}>
                                            <code>{'{timeslotExecutionDateFormatted}'}</code> — date du ménage (ex. 28 mars 2026).<br />
                                            <code>{'{timeslotExecutionDateFormattedEn}'}</code> — même date en anglais.<br />
                                            <code>{'{cleaningDayLineFr}'}</code> / <code>{'{cleaningDayLineEn}'}</code> — phrase « Ménage prévu le … ».<br />
                                            <strong>Heure du créneau</strong> : elle n&apos;existe qu&apos;après le choix client (lettre I). Avant ça, le plan fournit surtout le <strong>jour</strong> du ménage inclus.
                                        </Typography>
                                    </Alert>}
                                <Typography variant="h6" sx={{
              mb: 2,
              color: '#616161',
              fontWeight: 600
            }}>
                                    Messages OTA (Airbnb, Booking, etc.)
                                </Typography>
                                <Box sx={{
              borderBottom: '2px solid #e0e0e0',
              width: 'fit-content',
              mb: 2,
              position: 'relative',
              margin: '0px !important'
            }}>
                                    <StyledTabs value={langTab} onChange={(_, v) => setLangTab(v)} TabIndicatorProps={{
                style: {
                  backgroundColor: SOJORI_COLORS.primary,
                  height: 3,
                  borderRadius: 2,
                  width: 120,
                  left: `${langTab * 120}px`,
                  transition: 'left 0.3s cubic-bezier(.4,0,.2,1)'
                }
              }}>
                                        <StyledTab label={t('FRENCH')} />
                                        <StyledTab label={t('ENGLISH')} />
                                    </StyledTabs>
                                </Box>
                                <div className="flex flex-row gap-6">
                                    <Card className="!p-6 w-[60%]" sx={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                borderRadius: '12px',
                border: '1px solid #e0e0e0'
              }}>
                                        <div>
                                            <div className="mb-4">
                                                <label className="block mb-3 !text-base font-bold text-gray-700">
                                                    {langTab === 0 ? t('Your_model_is_written_in_French') : t('Your_model_is_written_in_English')}
                                                </label>
                                                <textarea name={langTab === 0 ? 'content' : 'contentEng'} className="w-full p-4 border-2 rounded-lg min-h-[450px] !text-sm font-mono focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35] focus:ring-opacity-20 transition-all" value={langTab === 0 ? messageContent : messageContentEng} onChange={e => langTab === 0 ? setMessageContent(e.target.value) : setMessageContentEng(e.target.value)} style={{
                      maxHeight: 600,
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#FF6B35 #f1f1f1',
                      lineHeight: '1.6'
                    }} />
                                            </div>
                                            <div className="mb-4">
                                                <DynamicFieldButtons availableFields={availableFields} insertField={insertField} isEnglish={langTab === 1} />
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="!p-6 w-[40%]" sx={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                height: 'fit-content'
              }}>
                                        <div>
                                            <label className="block mb-3 !text-base font-bold text-gray-700">
                                                {langTab === 0 ? t('Message_preview') : t('English_Message_preview')}
                                            </label>
                                            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg !text-sm whitespace-pre-wrap min-h-[450px] max-h-[600px] overflow-y-auto border border-gray-200" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#00b4b4 #f1f1f1',
                    lineHeight: '1.6'
                  }}>
                                                {aiMode && hasWeatherMessage(formData.messageName) ? aiPreviewLoading ? <Box display="flex" alignItems="center" justifyContent="center" minHeight={200}>
                                                            <CircularProgress size={32} />
                                                        </Box> : aiPreviewData ? langTab === 0 ? aiPreviewData.content : aiPreviewData.contentEng : getPreviewContent(langTab === 1) : langTab === 0 ? getPreviewContent(false) : getPreviewContent(true)}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </div>}

                        {!isAiView && !noWhatsappTemplates.includes(formData.messageName) && <div style={{
            marginTop: '48px'
          }}>
                                <Typography variant="h6" sx={{
              mb: 2,
              color: '#616161',
              fontWeight: 600
            }}>
                                    Messages WhatsApp
                                </Typography>
                                <Box sx={{
              borderBottom: '2px solid #e0e0e0',
              width: 'fit-content',
              mb: 2,
              position: 'relative',
              margin: '0px !important'
            }}>
                                    <StyledTabs value={langTab} onChange={(_, v) => setLangTab(v)} TabIndicatorProps={{
                style: {
                  backgroundColor: SOJORI_COLORS.primary,
                  height: 3,
                  borderRadius: 2,
                  width: 120,
                  left: `${langTab * 120}px`,
                  transition: 'left 0.3s cubic-bezier(.4,0,.2,1)'
                }
              }}>
                                        <StyledTab label={t('FRENCH')} />
                                        <StyledTab label={t('ENGLISH')} />
                                    </StyledTabs>
                                </Box>
                                <div className="flex flex-row gap-6">
                                    <Card className="!p-6 w-[60%]" sx={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                borderRadius: '12px',
                border: '1px solid #e0e0e0'
              }}>
                                        <div>
                                            <div className="mb-4">
                                                <label className="block mb-3 !text-base font-bold text-gray-700">
                                                    {langTab === 0 ? t('Your_whatsapp_message_is_written_in_French') : t('Your_whatsapp_message_is_written_in_English')}
                                                </label>
                                                <textarea name={langTab === 0 ? 'whatsappContent' : 'whatsappContentEng'} className="w-full p-4 border-2 rounded-lg min-h-[450px] !text-sm font-mono focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35] focus:ring-opacity-20 transition-all" value={langTab === 0 ? whatsappContent : whatsappContentEng} onChange={e => langTab === 0 ? setwhatsappContent(e.target.value) : setwhatsappContentEng(e.target.value)} style={{
                      maxHeight: 600,
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#FF6B35 #f1f1f1',
                      lineHeight: '1.6'
                    }} />
                                            </div>
                                            <div className="mb-4">
                                                <DynamicFieldButtons availableFields={availableFields} insertField={insertFieldWhatsapp} isEnglish={langTab === 1} />
                                            </div>
                                        </div>
                                    </Card>
                                    {/* Mobile Phone Container */}
                                    <div className="w-[40%] flex justify-center items-start">
                                        <div style={{
                  width: '375px',
                  maxWidth: '100%',
                  background: '#1a1a1a',
                  borderRadius: '36px',
                  padding: '12px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                  position: 'relative'
                }}>
                                            {/* Phone Notch */}
                                            <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '140px',
                    height: '28px',
                    background: '#000',
                    borderRadius: '0 0 20px 20px',
                    zIndex: 10
                  }} />

                                            {/* Phone Screen */}
                                            <Card className="!p-0" sx={{
                    borderRadius: '28px',
                    overflow: 'hidden',
                    boxShadow: 'none',
                    background: 'white'
                  }}>
                                                {/* Mobile Status Bar */}
                                                <div style={{
                      background: '#075E54',
                      padding: '8px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      color: 'white',
                      fontWeight: '600'
                    }}>
                                                    <span>{new Date().toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                                                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center'
                      }}>
                                                        <span>📶</span>
                                                        <span>📡</span>
                                                        <span>🔋</span>
                                                    </div>
                                                </div>

                                                {/* WhatsApp Header */}
                                                <div style={{
                      background: '#075E54',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                                                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#25D366',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                                                        S
                                                    </div>
                                                    <div style={{
                        flex: 1
                      }}>
                                                        <div style={{
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '15px'
                        }}>
                                                            Sojori
                                                        </div>
                                                        <div style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: '12px'
                        }}>
                                                            en ligne
                                                        </div>
                                                    </div>
                                                    <div style={{
                        display: 'flex',
                        gap: '18px',
                        color: 'white'
                      }}>
                                                        <span style={{
                          fontSize: '18px'
                        }}>📹</span>
                                                        <span style={{
                          fontSize: '18px'
                        }}>📞</span>
                                                        <span style={{
                          fontSize: '18px'
                        }}>⋮</span>
                                                    </div>
                                                </div>

                                                {/* WhatsApp Chat Area */}
                                                <div className="overflow-y-auto" style={{
                      height: '500px',
                      scrollbarWidth: 'none',
                      background: '#E5DDD5',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      padding: '12px'
                    }}>
                                                    {/* Date Separator */}
                                                    <div style={{
                        textAlign: 'center',
                        marginBottom: '12px'
                      }}>
                                                        <span style={{
                          background: 'rgba(255,255,255,0.85)',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#667781',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                                                            {new Date().toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                                                        </span>
                                                    </div>

                                                    {/* Message Bubble */}
                                                    <div style={{
                        maxWidth: '85%',
                        marginLeft: 'auto',
                        marginRight: '0',
                        background: '#DCF8C6',
                        padding: '6px 10px 4px 10px',
                        borderRadius: '8px 8px 0 8px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                        fontSize: '14px',
                        lineHeight: '1.4',
                        whiteSpace: 'pre-wrap',
                        position: 'relative',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        wordWrap: 'break-word',
                        marginBottom: '8px'
                      }}>
                                                        {/* Message Tail */}
                                                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          right: '-8px',
                          width: '0',
                          height: '0',
                          borderLeft: '8px solid #DCF8C6',
                          borderBottom: '8px solid transparent'
                        }} />

                                                        {langTab === 0 ? getPreviewwhatsappContent(false) : getPreviewwhatsappContent(true)}

                                                        <div style={{
                          fontSize: '10px',
                          color: '#667781',
                          textAlign: 'right',
                          marginTop: '4px',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                                                            <span>{new Date().toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                                                            <span style={{
                            color: '#4FC3F7',
                            fontSize: '14px'
                          }}>✓✓</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* WhatsApp Input Footer */}
                                                <div style={{
                      background: '#F0F2F5',
                      padding: '6px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                                                    <span style={{
                        fontSize: '22px'
                      }}>😊</span>
                                                    <div style={{
                        flex: 1,
                        background: 'white',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        color: '#8696a0'
                      }}>
                                                        {langTab === 0 ? 'Message' : 'Message'}
                                                    </div>
                                                    <span style={{
                        fontSize: '20px'
                      }}>📎</span>
                                                    <span style={{
                        fontSize: '20px'
                      }}>📷</span>
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            </div>}
                        
                    </div>

                </CardContent>
            </Card>
        </div>;
};
export default MailTemplateForm;
