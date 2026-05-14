import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import { getStoredCrmLeads, saveStoredCrmLeads, type CrmLeadRecord } from '../data/catalogueMock';
import {
  Badge,
  DataTable,
  FilterBar,
  FilterChip,
  PageHeader,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

export function CRMPage() {
  const { toast, showToast, hideToast } = useActionToast();
  const [leads, setLeads] = useState<CrmLeadRecord[]>(() => getStoredCrmLeads());
  const [statusFilter, setStatusFilter] = useState('all');
  const [qualificationFilter, setQualificationFilter] = useState('all');
  const [draft, setDraft] = useState<CrmLeadRecord | null>(null);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }
      if (qualificationFilter !== 'all' && lead.qualification !== qualificationFilter) {
        return false;
      }
      return true;
    });
  }, [leads, qualificationFilter, statusFilter]);

  const persist = (nextLeads: CrmLeadRecord[], message: string) => {
    setLeads(nextLeads);
    saveStoredCrmLeads(nextLeads);
    showToast(message);
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'CRM']}>
      <PageHeader title="CRM Leads & Demo" count={`${filteredLeads.length} opportunités`}>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast('Qualification IA mock calculée', 'info')}>
          ✨ Qualifier
        </Button>
        <Button
          sx={btnPrimarySx}
          onClick={() =>
            setDraft({
              id: `crm-${Date.now()}`,
              source: 'Manual',
              type: 'lead',
              contactName: '',
              company: '',
              email: '',
              phone: '',
              properties: 1,
              qualification: 'warm',
              status: 'new',
              pms: false,
              channelManager: false,
              dynamicPricing: false,
              createdAt: new Date().toLocaleString('fr-FR'),
              notes: '',
            })
          }
        >
          + Créer lead
        </Button>
      </PageHeader>

      <StatsRow>
        <StatCard icon="🧲" iconBg={t.primaryTint} iconColor={t.primary} value={String(leads.length)} label="Total leads" />
        <StatCard icon="🔥" iconBg={t.errorTint} iconColor={t.error} value={String(leads.filter((lead) => lead.qualification === 'hot').length)} label="Hot" />
        <StatCard icon="🎯" iconBg={t.successTint} iconColor={t.success} value={String(leads.filter((lead) => lead.status === 'won').length)} label="Won" />
        <StatCard icon="🗓️" iconBg={t.infoTint} iconColor={t.info} value={String(leads.filter((lead) => lead.type === 'demo').length)} label="Demos" />
      </StatsRow>

      <FilterBar>
        <FilterChip label={statusFilter === 'all' ? 'Tous statuts' : statusFilter} active={statusFilter !== 'all'} onClick={() => setStatusFilter('all')} dropdown />
        <FilterChip label={qualificationFilter === 'all' ? 'Toutes qualifs' : qualificationFilter} active={qualificationFilter !== 'all'} onClick={() => setQualificationFilter('all')} dropdown />
      </FilterBar>

      <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 1 }}>
        {['new', 'qualified', 'proposal', 'won', 'lost'].map((status) => (
          <Button key={status} sx={btnGhostSx} onClick={() => setStatusFilter((prev) => (prev === status ? 'all' : status))}>
            {status}
          </Button>
        ))}
        {['hot', 'warm', 'cold'].map((qualification) => (
          <Button key={qualification} sx={btnGhostSx} onClick={() => setQualificationFilter((prev) => (prev === qualification ? 'all' : qualification))}>
            {qualification}
          </Button>
        ))}
      </Stack>

      <DataTable
        columns={[
          { key: 'contactName', label: 'Contact', render: (row) => <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{row.contactName}</Typography> },
          { key: 'company', label: 'Company' },
          { key: 'source', label: 'Source' },
          { key: 'properties', label: 'Properties', align: 'right' },
          { key: 'qualification', label: 'Qualification', render: (row) => <Badge variant={row.qualification === 'hot' ? 'error' : row.qualification === 'warm' ? 'warning' : 'neutral'}>{row.qualification}</Badge> },
          { key: 'status', label: 'Status', render: (row) => <Badge variant={row.status === 'won' ? 'success' : row.status === 'lost' ? 'error' : 'info'}>{row.status}</Badge> },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <Stack direction="row" spacing={0.75}>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => setDraft(row)}>
                  Modifier
                </Button>
                <Button
                  sx={{ ...btnGhostSx, ...btnSmSx }}
                  onClick={() =>
                    persist(
                      leads.map((lead) =>
                        lead.id === row.id ? { ...lead, qualification: 'hot', status: 'qualified' } : lead,
                      ),
                      'Lead qualifié',
                    )
                  }
                >
                  Qualifier
                </Button>
                <Button
                  sx={{ ...btnGhostSx, ...btnSmSx }}
                  color="error"
                  onClick={() =>
                    persist(
                      leads.filter((lead) => lead.id !== row.id),
                      'Lead supprimé',
                    )
                  }
                >
                  Supprimer
                </Button>
              </Stack>
            ),
          },
        ]}
        rows={filteredLeads}
      />

      <Dialog open={!!draft} onClose={() => setDraft(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{draft && leads.some((lead) => lead.id === draft.id) ? 'Modifier opportunité' : 'Créer opportunité'}</DialogTitle>
        <DialogContent dividers>
          {draft && (
            <Stack spacing={2}>
              <TextField label="Contact" value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} />
              <TextField label="Company" value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} />
              <TextField label="Email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
              <TextField label="Téléphone" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
              <TextField label="Properties" type="number" value={draft.properties} onChange={(event) => setDraft({ ...draft, properties: Number(event.target.value || 1) })} />
              <TextField label="Qualification" select value={draft.qualification} onChange={(event) => setDraft({ ...draft, qualification: event.target.value as CrmLeadRecord['qualification'] })}>
                <MenuItem value="hot">Hot</MenuItem>
                <MenuItem value="warm">Warm</MenuItem>
                <MenuItem value="cold">Cold</MenuItem>
              </TextField>
              <TextField label="Status" select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CrmLeadRecord['status'] })}>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="qualified">Qualified</MenuItem>
                <MenuItem value="proposal">Proposal</MenuItem>
                <MenuItem value="won">Won</MenuItem>
                <MenuItem value="lost">Lost</MenuItem>
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDraft(null)}>Annuler</Button>
          <Button
            sx={btnPrimarySx}
            onClick={() => {
              if (!draft) return;
              const exists = leads.some((lead) => lead.id === draft.id);
              persist(exists ? leads.map((lead) => (lead.id === draft.id ? draft : lead)) : [draft, ...leads], exists ? 'Opportunité mise à jour' : 'Opportunité créée');
              setDraft(null);
            }}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      <ActionToast open={toast.open} message={toast.message} severity={toast.severity} onClose={hideToast} />
    </DashboardWrapper>
  );
}
