import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import { getStoredOnboarding, getStoredOwners, saveStoredOnboarding, type OnboardingRecord } from '../data/catalogueMock';
import {
  PageHeader,
  Panel,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

export function OnboardingPage() {
  const owners = getStoredOwners().filter((item) => item.role === 'owner');
  const { toast, showToast, hideToast } = useActionToast();
  const [items, setItems] = useState<OnboardingRecord[]>(() => getStoredOnboarding());
  const [draft, setDraft] = useState<OnboardingRecord | null>(null);
  const [detail, setDetail] = useState<OnboardingRecord | null>(null);

  const stats = useMemo(() => {
    return {
      total: items.length,
      inProgress: items.filter((item) => item.status === 'in_progress').length,
      blocked: items.filter((item) => item.status === 'blocked').length,
      done: items.filter((item) => item.status === 'done').length,
    };
  }, [items]);

  const persist = (nextItems: OnboardingRecord[], message: string) => {
    setItems(nextItems);
    saveStoredOnboarding(nextItems);
    showToast(message);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Onboarding']}>
      <PageHeader title="Owner Onboarding" count={`${items.length} owner flows`}>
        <Button
          sx={btnPrimarySx}
          onClick={() =>
            setDraft({
              id: `onb-${Date.now()}`,
              ownerId: owners[0]?.id || '',
              ownerName: owners[0]?.name || '',
              company: owners[0]?.company || '',
              progress: 0,
              status: 'not_started',
              step: 'Kickoff',
              listings: 1,
              updatedAt: new Date().toLocaleString('fr-FR'),
              blockers: [],
            })
          }
        >
          + Créer onboarding
        </Button>
      </PageHeader>

      <StatsRow>
        <StatCard icon="🧭" iconBg={t.primaryTint} iconColor={t.primary} value={String(stats.total)} label="Total" />
        <StatCard icon="⏳" iconBg={t.infoTint} iconColor={t.info} value={String(stats.inProgress)} label="En cours" />
        <StatCard icon="⛔" iconBg={t.errorTint} iconColor={t.error} value={String(stats.blocked)} label="Bloqués" />
        <StatCard icon="✅" iconBg={t.successTint} iconColor={t.success} value={String(stats.done)} label="Terminés" />
      </StatsRow>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
        {items.map((item) => (
          <Panel key={item.id} sx={{ p: 2 }}>
            <Stack spacing={1.25}>
              <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{item.ownerName}</Typography>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>{item.company}</Typography>
              <Box sx={{ height: 8, borderRadius: '99px', bgcolor: t.bg2, overflow: 'hidden' }}>
                <Box sx={{ width: `${item.progress}%`, height: '100%', bgcolor: item.status === 'blocked' ? t.error : item.status === 'done' ? t.success : t.primary }} />
              </Box>
              <Typography sx={{ fontSize: 12 }}>Step: {item.step}</Typography>
              <Typography sx={{ fontSize: 12 }}>Progression: {item.progress}%</Typography>
              <Typography sx={{ fontSize: 12 }}>Listings: {item.listings}</Typography>
              <Typography sx={{ fontSize: 12 }}>Status: {item.status}</Typography>
              {item.blockers.length > 0 && (
                <Typography sx={{ fontSize: 12, color: t.error }}>
                  Blockers: {item.blockers.join(', ')}
                </Typography>
              )}
              <Stack direction="row" spacing={1}>
                <Button sx={btnGhostSx} onClick={() => setDetail(item)}>
                  Voir détail
                </Button>
                <Button sx={btnGhostSx} onClick={() => setDraft(item)}>
                  Modifier
                </Button>
                <Button
                  sx={btnGhostSx}
                  onClick={() =>
                    persist(
                      items.map((entry) =>
                        entry.id === item.id
                          ? {
                              ...entry,
                              progress: Math.min(entry.progress + 10, 100),
                              status: entry.progress + 10 >= 100 ? 'done' : 'in_progress',
                            }
                          : entry,
                      ),
                      'Progression onboarding mise à jour',
                    )
                  }
                >
                  Avancer
                </Button>
              </Stack>
            </Stack>
          </Panel>
        ))}
      </Box>

      <Dialog open={!!draft} onClose={() => setDraft(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{draft && items.some((item) => item.id === draft.id) ? 'Modifier onboarding' : 'Créer onboarding'}</DialogTitle>
        <DialogContent dividers>
          {draft && (
            <Stack spacing={2}>
              <TextField
                label="Owner"
                select
                value={draft.ownerId}
                onChange={(event) => {
                  const owner = owners.find((item) => item.id === event.target.value);
                  setDraft({
                    ...draft,
                    ownerId: event.target.value,
                    ownerName: owner?.name || draft.ownerName,
                    company: owner?.company || draft.company,
                  });
                }}
              >
                {owners.map((owner) => (
                  <MenuItem key={owner.id} value={owner.id}>
                    {owner.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Étape courante" value={draft.step} onChange={(event) => setDraft({ ...draft, step: event.target.value })} />
              <TextField label="Progression" type="number" value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: Number(event.target.value || 0) })} />
              <TextField label="Listings" type="number" value={draft.listings} onChange={(event) => setDraft({ ...draft, listings: Number(event.target.value || 1) })} />
              <TextField label="Status" select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as OnboardingRecord['status'] })}>
                <MenuItem value="not_started">Not started</MenuItem>
                <MenuItem value="in_progress">In progress</MenuItem>
                <MenuItem value="blocked">Blocked</MenuItem>
                <MenuItem value="done">Done</MenuItem>
              </TextField>
              <TextField label="Blockers" multiline rows={3} value={draft.blockers.join(', ')} onChange={(event) => setDraft({ ...draft, blockers: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)}>Annuler</Button>
          <Button
            sx={btnPrimarySx}
            onClick={() => {
              if (!draft) return;
              const exists = items.some((item) => item.id === draft.id);
              persist(exists ? items.map((item) => (item.id === draft.id ? draft : item)) : [draft, ...items], exists ? 'Onboarding mis à jour' : 'Onboarding créé');
              setDraft(null);
            }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Détail onboarding</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.5}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{detail.ownerName}</Typography>
              <Typography sx={{ fontSize: 12 }}>Company: {detail.company}</Typography>
              <Typography sx={{ fontSize: 12 }}>Étape: {detail.step}</Typography>
              <Typography sx={{ fontSize: 12 }}>Progression: {detail.progress}%</Typography>
              <Typography sx={{ fontSize: 12 }}>Status: {detail.status}</Typography>
              <Typography sx={{ fontSize: 12 }}>Listings: {detail.listings}</Typography>
              <Typography sx={{ fontSize: 12 }}>Dernière mise à jour: {detail.updatedAt}</Typography>
              <Typography sx={{ fontSize: 12 }}>
                Blockers: {detail.blockers.length > 0 ? detail.blockers.join(', ') : 'Aucun'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Fermer</Button>
          {detail && (
            <Button
              sx={btnPrimarySx}
              onClick={() => {
                setDetail(null);
                setDraft(detail);
              }}
            >
              Modifier
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ActionToast open={toast.open} message={toast.message} severity={toast.severity} onClose={hideToast} />
    </DashboardWrapper>
  );
}
