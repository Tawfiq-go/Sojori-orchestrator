import React, { useState, useEffect } from 'react'; import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Switch } from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { updateOpenAiConfig } from '../services/serverApi.adminConfig';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';

const ModOpeniaConfigTop = ({ open, onClose, openAiConfigItem, setOpenAiConfigItem, dataOpenAi, openAiIndex, owners, openAiConfigs }) => {
  const { t } = useTranslation('common'); const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);
  const validationSchema = (isAdmin) => Yup.object({
    type: Yup.string().required(t('Type is Required')),
    description_openai: Yup.string().required(t('Description is Required')),
    enable: Yup.boolean().required(t('Enable is Required')),
    ownerId: isAdmin ? Yup.string().required(t('Owner is required')) : Yup.string(),   
  });
  
  const formik = useFormik({
    initialValues: {
      type: '',
      description_openai: '',
      enable: false,
      ownerId: isAdmin ? '' : (user.role === 'Worker' ? user.ownerId : user._id),
    },
    validationSchema: validationSchema(isAdmin),
    onSubmit: (values, { resetForm }) => {
      setIsLoading(true);

      if (values.type === "About Us") {
        const alreadyExists = openAiConfigs.some(config => 
          config.type === "About Us" &&
          config.ownerId === values.ownerId &&
          config._id !== dataOpenAi._id
        );
        if (alreadyExists) {
          toast.error(t('This owner already has an About Us configuration.'));
          setIsLoading(false);
          return;
        }
      }

      const dataNew = dataOpenAi;
      dataNew.type = values?.type;
      dataNew.description_openai = values?.description_openai;
      dataNew.enable = values?.enable;
      dataNew.ownerId = values.ownerId;
      updateOpenAiConfig(dataOpenAi._id, dataNew)
        .then((data) => {
          let newConfig = [...openAiConfigItem];
          newConfig[openAiIndex] = data.data.openAiConfig;
          setOpenAiConfigItem(newConfig);
          resetForm();
          onClose();
          toast.success(t('Modified Successfully'));
        })
        .catch((error) => {
          setErrorMessage(error.message); // Assuming error.message contains error text
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
  });

  useEffect(() => {
    if (dataOpenAi) {
      formik.setValues({
        type: dataOpenAi.type || '',
        description_openai: dataOpenAi.description_openai || '',
        enable: dataOpenAi.enable || false,
        ownerId: dataOpenAi.ownerId || (isAdmin ? '' : (user.role === 'Worker' ? user.ownerId : user._id)),
      });
    }
  }, [dataOpenAi]);

  return (
    <Dialog PaperProps={{ style: { width: 500 } }} open={open} onClose={onClose}>
      <DialogTitle sx={{ padding: '30px', textAlign: 'center' }}>{t('Modify Ai Config')}</DialogTitle>
      <DialogContent>
        <form onSubmit={formik.handleSubmit}>
          <div className="mb-3 text-center">
            <label htmlFor="type" className="form-label">
              {t('Type')}
            </label>
            <input
              className="form-control"
              type="text"
              id="type"
              name="type"
              value={formik.values.type}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={dataOpenAi?.type === "About Us"}
            />
            {formik.touched.type && formik.errors.type ? (
              <div className="text-danger">{formik.errors.type}</div>
            ) : null}
          </div>
          {isAdmin && (
            <div className="mb-3 text-center">
              <label htmlFor="ownerId" className="form-label">{t('Owner')}</label>
              <select
                id="ownerId"
                name="ownerId"
                value={formik.values.ownerId}
                onChange={formik.handleChange}
                className="w-full px-2 py-2 text-sm border rounded"
              >
                <option value="">{t('Select Owner')}</option>
                {owners && owners.map(owner => (
                  <option key={owner._id} value={owner._id}>
                    {owner.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="mb-3 text-center">
            <label htmlFor="description_openai" className="form-label">
              {t('Description')}
            </label>
            <textarea
              className="form-control"
              id="description_openai"
              name="description_openai"
              value={formik.values.description_openai}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={8}   
              cols={50}  
            />
            {formik.touched.description_openai && formik.errors.description_openai ? (
              <div className="text-danger">{formik.errors.description_openai}</div>
            ) : null}
          </div>
          <div className="mb-3 text-center">
            <label htmlFor="enable" className="form-label">
              {t('Enable')}
            </label>
            <Switch
              id="enable"
              checked={formik.values.enable}
              onChange={(event) => {
                formik.setFieldValue('enable', event.target.checked);
              }}
            />
            {formik.touched.enable && formik.errors.enable ? (
              <div className="text-danger">{formik.errors.enable}</div>
            ) : null}
          </div>

          <DialogActions>
            <Button onClick={onClose} color="secondary">
              {t('Cancel')}
            </Button>
            <Button type="submit" color="primary" disabled={formik.isSubmitting}>
              {isLoading ? t('Saving...') : t('Save')}
            </Button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModOpeniaConfigTop;