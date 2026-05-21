import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { SOJORI_TOKENS as T } from './types';
import { SectionHeader, Card, FormRow, TextArea, WhenOffNote } from './SHARED';

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
}

export default function MessagesConfigTab({ listingValues = {} }: Props) {
  const messageCheckout = (listingValues.messageCheckout as string[]) || ['', ''];
  const [messageFr, setMessageFr] = useState(messageCheckout[0] || messageCheckout[1] || '');

  useEffect(() => {
    const mc = (listingValues.messageCheckout as string[]) || ['', ''];
    setMessageFr(mc[0] || mc[1] || '');
  }, [listingValues.messageCheckout]);

  if (!listingValues || Object.keys(listingValues).length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: T.text3 }}>
        <CircularProgress size={24} sx={{ color: T.primary, mb: 2 }} />
        <Typography>Chargement des instructions départ depuis le listing…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <SectionHeader
        icon="📜"
        title="Instructions départ"
        badge="WA · OUI"
        badgeKind="wa-yes"
        subtitle={
          <>
            Message envoyé au voyageur avant le départ. Persisté via <b>messageCheckout</b> sur le document listing (onglet Détail → sauvegarde globale).
          </>
        }
      />

      <Card icon="📝" title="Message check-out" subtitle="Français uniquement · EN = copie FR à la sauvegarde listing" meta="messageCheckout[0]">
        <FormRow label="Instructions départ" schemaPath="messageCheckout[0]" inSchema>
          <TextArea
            rows={5}
            value={messageFr}
            onChange={e => setMessageFr(e.target.value)}
            placeholder="Consignes de départ, clés, poubelles…"
          />
        </FormRow>
      </Card>

      <WhenOffNote>
        <b style={{ color: T.text }}>Sauvegarde</b> · utilisez « Sauvegarder » en bas du formulaire listing (onglet Détail) pour persister{' '}
        <code>messageCheckout</code>. Collection dédiée messages-config : à créer côté srv-listing.
      </WhenOffNote>
    </Box>
  );
}
