import React from 'react';
import { Button, Switch, FormControlLabel, ToggleButtonGroup, ToggleButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
const hasWeatherMessage = messageName => messageName === 'RAPPEL_X_JOURS_AVANT_ARRIVEE' || messageName === 'MESSAGE_METEO_AVANT_ARRIVEE';
const MailTemplateTopBar = ({
  templateId,
  templateIdState,
  ChangeTemplateByName,
  t,
  isAdmin,
  templates,
  owners,
  formData,
  setFormData,
  newEmailName,
  allowedTypes,
  noWhatsappTemplates,
  renderOwnerSelect,
  handleSave,
  onCancel,
  aiMode,
  setAiMode
}) => {
  const showAiToggle = hasWeatherMessage(formData.messageName);
  const getOrderIndex = messageName => {
    const idx = newEmailName.findIndex(e => e.value === messageName);
    return idx === -1 ? 9999 : idx;
  };
  return <div className="bg-white py-4">
      <div className="flex items-end gap-4 pb-4">
        <Button startIcon={<ArrowBackIcon />} onClick={onCancel} className="!text-gray-700 !bg-gray-100 !rounded !px-3 !py-1" sx={{
        minWidth: 0,
        textTransform: 'none'
      }}>
          {t('Back')}
        </Button>
        {templateId && <select className="w-[220px] !px-2 !py-2 border rounded !text-sm" value={templateIdState} onChange={e => ChangeTemplateByName(e.target.value)}>
            {!templateIdState && <option value="">{t('Select a template')}</option>}
            {isAdmin ? (() => {
          const byOwner = templates.reduce((acc, tpl) => {
            const key = String(tpl.ownerId || 'no-owner');
            (acc[key] ||= []).push(tpl);
            return acc;
          }, {});
          const ownerLabel = id => {
            const o = owners.find(x => String(x._id) === String(id));
            return o ? `${o.firstName} ${o.lastName}` : t('No Owner');
          };
          return Object.keys(byOwner).sort((a, b) => ownerLabel(a).localeCompare(ownerLabel(b))).map(ownerId => <optgroup key={ownerId} label={ownerLabel(ownerId)}>
                        {byOwner[ownerId].slice().sort((a, b) => getOrderIndex(a.messageName) - getOrderIndex(b.messageName)).map(tpl => <option key={tpl._id} value={tpl._id}>
                              {t(tpl.messageName)}
                            </option>)}
                      </optgroup>);
        })() : templates.slice().sort((a, b) => getOrderIndex(a.messageName) - getOrderIndex(b.messageName)).map(tpl => <option key={tpl._id} value={tpl._id}>
                      {t(tpl.messageName)}
                    </option>)}
          </select>}
        <div className="flex-1 flex justify-end">
          <Button variant="contained" color="primary" className="!bg-medium-aquamarine !text-white !px-4 !py-2 !rounded" onClick={handleSave}>
            {t('Save_Template')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1 min-w-[220px]">
          <label className="block mb-0.5 text-xs text-gray-600">{templateId ? t('Description') : t('Name')}</label>
          {templateId ? <input type="text" className="w-full !px-2 !py-2 border rounded !text-sm border-gray-300 focus:border-[#00b4b4] focus:ring-1 focus:ring-[#00b4b4]" value={formData.description || ''} onChange={e => setFormData({
          ...formData,
          description: e.target.value
        })} placeholder={t(formData.messageName)} /> : <select className="w-full !px-2 !py-2 border rounded !text-sm" value={formData.messageName} onChange={e => {
          const newMessageName = e.target.value;
          if (newMessageName !== formData.messageName) {
            setFormData({
              ...formData,
              messageName: newMessageName
            });
          }
        }}>
              {newEmailName.map(name => <option key={name.value} value={name.value}>
                  {name.label}
                </option>)}
            </select>}
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="block mb-0.5 text-xs text-gray-600">{t('Type')}</label>
          <select className="w-full !px-2 !py-2 border rounded !text-sm" value={formData.type} onChange={e => {
          const newType = e.target.value;
          if (newType !== formData.type) {
            setFormData({
              ...formData,
              type: newType
            });
          }
        }}>
            {allowedTypes.map(type => <option key={type.value} value={type.value}>
                {type.label}
              </option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="block mb-0.5 text-xs text-gray-600">{t('Status')}</label>
          <FormControlLabel control={<Switch checked={formData.enabled} onChange={e => setFormData({
          ...formData,
          enabled: e.target.checked
        })} sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#00b4b4',
            '&:hover': {
              backgroundColor: 'rgba(0, 180, 180, 0.08)'
            }
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#00b4b4'
          }
        }} className="!text-medium-aquamarine" />} label={formData.enabled ? t('Enabled') : t('Disabled')} className="!m-0" />
        </div>
        {showAiToggle && <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="block mb-0.5 text-xs text-gray-600">AI</label>
            <ToggleButtonGroup value={aiMode} exclusive onChange={(_, v) => {
          if (v !== null) {
            setAiMode(v);
          }
        }} size="small" sx={{
          height: 36
        }}>
              <ToggleButton value={false}>Non</ToggleButton>
              <ToggleButton value={true}>Oui</ToggleButton>
            </ToggleButtonGroup>
          </div>}
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="block mb-0.5 text-xs text-gray-600">{t('Message')}</label>
          <FormControlLabel control={<Switch checked={formData.messageEnabled} onChange={e => setFormData({
          ...formData,
          messageEnabled: e.target.checked
        })} sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#00b4b4',
            '&:hover': {
              backgroundColor: 'rgba(0, 180, 180, 0.08)'
            }
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#00b4b4'
          }
        }} className="!text-medium-aquamarine" />} label={formData.messageEnabled ? t('Enabled') : t('Disabled')} className="!m-0" />
        </div>
        {!noWhatsappTemplates.includes(formData.messageName) && <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="block mb-0.5 text-xs text-gray-600">{t('Whatsapp')}</label>
            <FormControlLabel control={<Switch checked={formData.whatsappEnabled} onChange={e => setFormData({
          ...formData,
          whatsappEnabled: e.target.checked
        })} sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#00b4b4',
            '&:hover': {
              backgroundColor: 'rgba(0, 180, 180, 0.08)'
            }
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#00b4b4'
          }
        }} className="!text-medium-aquamarine" />} label={formData.whatsappEnabled ? t('Enabled') : t('Disabled')} className="!m-0" />
          </div>}
        <div className="min-w-[180px]">{renderOwnerSelect()}</div>
      </div>
    </div>;
};
export default MailTemplateTopBar;
