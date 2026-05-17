/**
 * Étape 2: Champs Demande Client (dynamiques selon type + config listing)
 *
 * Pour TRANSPORT/GROCERIES/CUSTOM/SUPPORT: affiche les services configurés
 * dans le listing (comme WhatsApp chatbot).
 * Pour ARRIVAL/DEPARTURE/CLEANING/REGISTRATION: champs fixes.
 */

import React from 'react'
import {
  Box,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Grid,
  Chip,
  Alert,
  Paper,
  Divider,
} from '@mui/material'
import type { TaskFormData, ClientRequestData, ListingConciergeService, ListingSupportCategory } from './types'

// ── Default fallback values (when no listing config) ─────────────────────────

const DEFAULT_TRANSPORT_SERVICES: ListingConciergeService[] = [
  {
    id: 'default_airport',
    categoryId: 'transport_airport',
    categoryGroup: 'TRANSPORT',
    name: 'Transfert Aéroport',
    nameFr: 'Transfert Aéroport',
    nameEn: 'Airport Transfer',
    description: '',
    price: 0,
    priceType: 'total',
    currency: 'MAD',
  },
  {
    id: 'default_train',
    categoryId: 'transport_train',
    categoryGroup: 'TRANSPORT',
    name: 'Transfert Gare',
    nameFr: 'Transfert Gare',
    nameEn: 'Train Station Transfer',
    description: '',
    price: 0,
    priceType: 'total',
    currency: 'MAD',
  },
]

const DEFAULT_GROCERY_SERVICES: ListingConciergeService[] = [
  {
    id: 'default_grocery',
    categoryId: 'grocery_basic',
    categoryGroup: 'GROCERIES',
    name: 'Service de courses',
    nameFr: 'Service de courses',
    nameEn: 'Grocery service',
    description: '',
    price: 0,
    priceType: 'service_fee_only',
    currency: 'MAD',
  },
]

const DEFAULT_CUSTOM_SERVICES: ListingConciergeService[] = [
  {
    id: 'default_custom',
    categoryId: 'custom_request',
    categoryGroup: 'CUSTOM',
    name: 'Demande personnalisée',
    nameFr: 'Demande personnalisée',
    nameEn: 'Custom request',
    description: '',
    price: 0,
    priceType: 'quote',
    currency: 'MAD',
  },
]

const DEFAULT_SUPPORT_CATEGORIES: ListingSupportCategory[] = [
  { id: 'wifi', categoryId: 'wifi_issue', categoryGroup: 'SUPPORT', name: 'Problème WiFi', nameFr: 'Problème WiFi', nameEn: 'WiFi Issue', icon: '📶', priority: 'normal', description: '' },
  { id: 'heating', categoryId: 'heating_issue', categoryGroup: 'SUPPORT', name: 'Problème Chauffage', nameFr: 'Problème Chauffage', nameEn: 'Heating Issue', icon: '🌡️', priority: 'normal', description: '' },
  { id: 'appliance', categoryId: 'appliance_issue', categoryGroup: 'SUPPORT', name: 'Problème Équipement', nameFr: 'Problème Équipement', nameEn: 'Appliance Issue', icon: '🔌', priority: 'normal', description: '' },
  { id: 'plumbing', categoryId: 'plumbing_issue', categoryGroup: 'SUPPORT', name: 'Problème Plomberie', nameFr: 'Problème Plomberie', nameEn: 'Plumbing Issue', icon: '🚿', priority: 'normal', description: '' },
  { id: 'electrical', categoryId: 'electrical_issue', categoryGroup: 'SUPPORT', name: 'Problème Électrique', nameFr: 'Problème Électrique', nameEn: 'Electrical Issue', icon: '⚡', priority: 'normal', description: '' },
  { id: 'access', categoryId: 'access_issue', categoryGroup: 'SUPPORT', name: "Problème d'Accès", nameFr: "Problème d'Accès", nameEn: 'Access Issue', icon: '🔑', priority: 'normal', description: '' },
  { id: 'other', categoryId: 'other', categoryGroup: 'SUPPORT', name: 'Autre', nameFr: 'Autre', nameEn: 'Other', icon: '🔧', priority: 'normal', description: '' },
]

// ─────────────────────────────────────────────────────────────────────────────

interface Step2Props {
  formData: TaskFormData
  onChange: (clientRequest: ClientRequestData) => void
}

export function Step2ClientRequest({ formData, onChange }: Step2Props) {
  const { taskType, reservation, clientRequest, listingServices } = formData

  const handleChange = (field: keyof ClientRequestData, value: any) => {
    onChange({ ...clientRequest, [field]: value })
  }

  // Auto-fill dates from reservation for ARRIVAL/DEPARTURE
  React.useEffect(() => {
    if (!reservation) return

    if (taskType === 'ARRIVAL' && !clientRequest.date) {
      const arrivalDate = reservation.checkIn || reservation.arrivalDate
      if (arrivalDate) handleChange('date', new Date(arrivalDate))
    }

    if (taskType === 'DEPARTURE' && !clientRequest.date) {
      const departureDate = reservation.checkOut || reservation.departureDate
      if (departureDate) handleChange('date', new Date(departureDate))
    }
  }, [taskType, reservation])

  if (!taskType) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Sélectionnez d&apos;abord un type de tâche (Étape 1)
      </Alert>
    )
  }

  // ── Resolve services from listing config or fallback ──────────────────────

  const transportServices = listingServices?.transport?.length
    ? listingServices.transport
    : DEFAULT_TRANSPORT_SERVICES

  const groceryServices = listingServices?.grocery?.length
    ? listingServices.grocery
    : DEFAULT_GROCERY_SERVICES

  const customServices = listingServices?.custom?.length
    ? listingServices.custom
    : DEFAULT_CUSTOM_SERVICES

  const supportCategories = listingServices?.support?.length
    ? listingServices.support
    : DEFAULT_SUPPORT_CATEGORIES

  const usingListingConfig = !!listingServices

  // ── Shared service picker ──────────────────────────────────────────────────

  const ServiceCard = ({
    service,
    selected,
    onSelect,
  }: {
    service: ListingConciergeService
    selected: boolean
    onSelect: () => void
  }) => (
    <Paper
      onClick={onSelect}
      elevation={selected ? 3 : 1}
      sx={{
        p: 1.5,
        cursor: 'pointer',
        border: selected ? '2px solid #FF6B35' : '1px solid #e0e0e0',
        bgcolor: selected ? '#fff8f5' : '#fff',
        transition: 'all 0.15s',
        '&:hover': { borderColor: '#FF6B35', bgcolor: '#fff8f5' },
      }}
    >
      <Typography variant="body2" fontWeight={selected ? 700 : 400}>
        {service.nameFr}
      </Typography>
      {service.description && (
        <Typography variant="caption" color="text.secondary">
          {service.description}
        </Typography>
      )}
      {service.price > 0 && (
        <Typography variant="caption" color="#FF6B35" display="block" fontWeight={600}>
          {service.priceType === 'per_person'
            ? `${service.price} ${service.currency}/pers.`
            : service.priceType === 'service_fee_only'
            ? `Frais de service: ${service.price} ${service.currency}`
            : `${service.price} ${service.currency}`}
        </Typography>
      )}
      {service.priceType === 'quote' && (
        <Typography variant="caption" color="text.secondary" display="block">
          Sur devis
        </Typography>
      )}
      {service.capacity && (
        <Typography variant="caption" color="text.secondary" display="block">
          Max {service.capacity.maxPassengers} passager(s)
        </Typography>
      )}
    </Paper>
  )

  const SupportCard = ({
    category,
    selected,
    onSelect,
  }: {
    category: ListingSupportCategory
    selected: boolean
    onSelect: () => void
  }) => (
    <Paper
      onClick={onSelect}
      elevation={selected ? 3 : 1}
      sx={{
        p: 1.5,
        cursor: 'pointer',
        border: selected ? '2px solid #F44336' : '1px solid #e0e0e0',
        bgcolor: selected ? '#fff5f5' : '#fff',
        transition: 'all 0.15s',
        '&:hover': { borderColor: '#F44336', bgcolor: '#fff5f5' },
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography fontSize={20}>{category.icon}</Typography>
      <Box>
        <Typography variant="body2" fontWeight={selected ? 700 : 400}>
          {category.nameFr}
        </Typography>
        {category.description && (
          <Typography variant="caption" color="text.secondary">
            {category.description}
          </Typography>
        )}
      </Box>
    </Paper>
  )

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Détails —{' '}
        {taskType === 'TRANSPORT' && 'Transport'}
        {taskType === 'GROCERIES' && 'Courses'}
        {taskType === 'CUSTOM' && 'Demande Personnalisée'}
        {taskType === 'SUPPORT' && 'Support'}
        {taskType === 'ARRIVAL' && 'Arrivée'}
        {taskType === 'DEPARTURE' && 'Départ'}
        {taskType === 'CLEANING' && 'Ménage'}
        {taskType === 'REGISTRATION' && 'Enregistrement'}
      </Typography>

      {usingListingConfig && ['TRANSPORT', 'GROCERIES', 'CUSTOM', 'SUPPORT'].includes(taskType) && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Config depuis le logement sélectionné (identique au chatbot WhatsApp)
        </Typography>
      )}

      {/* ── ARRIVAL / DEPARTURE ───────────────────────────────────────────── */}
      {(taskType === 'ARRIVAL' || taskType === 'DEPARTURE') && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label={taskType === 'ARRIVAL' ? "Jour d'arrivée" : 'Jour de départ'}
              type="date"
              value={clientRequest.date ? new Date(clientRequest.date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="📅 Auto-rempli depuis la réservation"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <FormLabel>Créneau horaire</FormLabel>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {[
                  { start: 8, end: 10, label: '8h-10h' },
                  { start: 10, end: 12, label: '10h-12h' },
                  { start: 14, end: 16, label: '14h-16h' },
                  { start: 16, end: 18, label: '16h-18h' },
                ].map((slot) => (
                  <Chip
                    key={slot.label}
                    label={slot.label}
                    onClick={() => handleChange('timeslot', { start: slot.start, end: slot.end })}
                    color={
                      clientRequest.timeslot?.start === slot.start &&
                      clientRequest.timeslot?.end === slot.end
                        ? 'primary'
                        : 'default'
                    }
                    variant={
                      clientRequest.timeslot?.start === slot.start &&
                      clientRequest.timeslot?.end === slot.end
                        ? 'filled'
                        : 'outlined'
                    }
                  />
                ))}
              </Box>
            </FormControl>
          </Grid>

          {clientRequest.timeslot && (
            <Grid item xs={12}>
              <Alert severity="success">
                Créneau sélectionné: {clientRequest.timeslot.start}h - {clientRequest.timeslot.end}h
              </Alert>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── CLEANING ─────────────────────────────────────────────────────── */}
      {taskType === 'CLEANING' && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl>
              <FormLabel>Type de ménage</FormLabel>
              <RadioGroup
                value={clientRequest.cleaningType || 'free'}
                onChange={(e) => handleChange('cleaningType', e.target.value)}
                row
              >
                <FormControlLabel value="free" control={<Radio />} label="Gratuit" />
                <FormControlLabel value="paid" control={<Radio />} label="Payant" />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Date du ménage"
              type="date"
              value={clientRequest.date ? new Date(clientRequest.date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {clientRequest.cleaningType === 'paid' && (
            <Grid item xs={12}>
              <TextField
                label="Prix (€)"
                type="number"
                value={clientRequest.price || 0}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                fullWidth
                inputProps={{ min: 0, step: 10 }}
              />
            </Grid>
          )}
        </Grid>
      )}

      {/* ── REGISTRATION ─────────────────────────────────────────────────── */}
      {taskType === 'REGISTRATION' && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Date d'enregistrement"
              type="date"
              value={clientRequest.date ? new Date(clientRequest.date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      )}

      {/* ── TRANSPORT ────────────────────────────────────────────────────── */}
      {taskType === 'TRANSPORT' && (
        <Grid container spacing={2}>
          {/* Service selector from listing config */}
          <Grid item xs={12}>
            <FormLabel sx={{ mb: 1, display: 'block' }}>
              Service de transport {!usingListingConfig && '(défaut)'}
            </FormLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
              {transportServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={clientRequest.categoryId === service.categoryId}
                  onSelect={() => {
                    handleChange('categoryId', service.categoryId)
                    handleChange('categoryName', service.nameFr)
                    if (service.price > 0) handleChange('price', service.price)
                  }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Heure de prise en charge"
              type="time"
              value={
                clientRequest.pickupTime
                  ? new Date(clientRequest.pickupTime).toTimeString().substring(0, 5)
                  : ''
              }
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':')
                const date = new Date()
                date.setHours(parseInt(hours), parseInt(minutes))
                handleChange('pickupTime', date)
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre de passagers"
              type="number"
              value={clientRequest.passengers || 1}
              onChange={(e) => handleChange('passengers', parseInt(e.target.value) || 1)}
              fullWidth
              inputProps={{ min: 1, max: 20 }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="N° vol / train (optionnel)"
              value={clientRequest.flightNumber || ''}
              onChange={(e) => handleChange('flightNumber', e.target.value)}
              fullWidth
              placeholder="AF1234"
            />
          </Grid>
        </Grid>
      )}

      {/* ── GROCERIES ────────────────────────────────────────────────────── */}
      {taskType === 'GROCERIES' && (
        <Grid container spacing={2}>
          {/* Service selector from listing config */}
          <Grid item xs={12}>
            <FormLabel sx={{ mb: 1, display: 'block' }}>
              Service de courses {!usingListingConfig && '(défaut)'}
            </FormLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
              {groceryServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={clientRequest.categoryId === service.categoryId}
                  onSelect={() => {
                    handleChange('categoryId', service.categoryId)
                    handleChange('categoryName', service.nameFr)
                    if (service.price > 0) handleChange('price', service.price)
                  }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <TextField
              label="Liste des articles"
              value={clientRequest.items?.join(', ') || ''}
              onChange={(e) => {
                const items = e.target.value.split(',').map((i) => i.trim()).filter(Boolean)
                handleChange('items', items)
              }}
              multiline
              rows={4}
              fullWidth
              placeholder="Pain, Lait, Œufs, Fromage..."
              helperText="Séparez les articles par des virgules"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Budget estimé (MAD)"
              type="number"
              value={clientRequest.budget || 0}
              onChange={(e) => handleChange('budget', parseFloat(e.target.value) || 0)}
              fullWidth
              inputProps={{ min: 0, step: 10 }}
            />
          </Grid>
        </Grid>
      )}

      {/* ── CUSTOM ───────────────────────────────────────────────────────── */}
      {taskType === 'CUSTOM' && (
        <Grid container spacing={2}>
          {/* Service selector from listing config */}
          <Grid item xs={12}>
            <FormLabel sx={{ mb: 1, display: 'block' }}>
              Type de demande {!usingListingConfig && '(défaut)'}
            </FormLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
              {customServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={clientRequest.categoryId === service.categoryId}
                  onSelect={() => {
                    handleChange('categoryId', service.categoryId)
                    handleChange('categoryName', service.nameFr)
                  }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12}>
            <TextField
              label="Description de la demande"
              value={clientRequest.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={5}
              fullWidth
              placeholder="Décrivez la demande personnalisée..."
            />
          </Grid>
        </Grid>
      )}

      {/* ── SUPPORT ──────────────────────────────────────────────────────── */}
      {taskType === 'SUPPORT' && (
        <Grid container spacing={2}>
          {/* Category selector from listing config */}
          <Grid item xs={12}>
            <FormLabel sx={{ mb: 1, display: 'block' }}>
              Catégorie {!usingListingConfig && '(défaut)'}
            </FormLabel>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 1 }}>
              {supportCategories.map((category) => (
                <SupportCard
                  key={category.id}
                  category={category}
                  selected={
                    clientRequest.categoryId === category.categoryId ||
                    clientRequest.categoryName === category.nameFr
                  }
                  onSelect={() => {
                    handleChange('categoryId', category.categoryId)
                    handleChange('categoryName', category.nameFr)
                  }}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={12}><Divider /></Grid>

          <Grid item xs={12} sm={6}>
            <FormControl>
              <FormLabel>Urgence</FormLabel>
              <RadioGroup
                value={clientRequest.urgency || 'normal'}
                onChange={(e) => handleChange('urgency', e.target.value)}
                row
              >
                <FormControlLabel value="immediate" control={<Radio />} label="Immédiate" />
                <FormControlLabel value="normal" control={<Radio />} label="Normale" />
                <FormControlLabel value="scheduled" control={<Radio />} label="Planifiée" />
              </RadioGroup>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description du problème"
              value={clientRequest.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              multiline
              rows={4}
              fullWidth
              placeholder="Décrivez le problème en détail..."
            />
          </Grid>
        </Grid>
      )}

      <Alert severity="info" sx={{ mt: 2 }}>
        💡 Ces informations seront utilisées pour créer la demande client. Vous pourrez ajuster les
        détails à l&apos;étape suivante.
      </Alert>
    </Box>
  )
}
