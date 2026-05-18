import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  CircularProgress,
  Chip,
  Box,
  Divider,
  IconButton,
} from '@mui/material';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import InteractionIcon from '@mui/icons-material/QuestionAnswer';
import RulesIcon from '@mui/icons-material/Gavel';
import StoryIcon from '@mui/icons-material/AutoStories';
import RefreshIcon from '@mui/icons-material/Refresh';

const Description = ({
  loading,
  descriptions,
  editMode,
  editData,
  saving,
  onEditClick,
  onCancelEdit,
  onSave,
  onInputChange,
  onRetry,
  t,
  canUpdate,
}) => {
  const [errors, setErrors] = useState({
    interaction: '',
    houseRules: '',
    ownerListingStory: '',
  });
  const [isFormValid, setIsFormValid] = useState(true);

  const validateInput = (value) => {
    if (!value.trim()) {
      return t('error_empty_input');
    }
    if (value.trim().length < 3) {
      return t('error_too_short');
    }
    return '';
  };

  /** Only validate fields the user filled — empty fields are allowed (partial save). */
  const validateForm = () => {
    const v = (val) => {
      const s = (val || '').trim();
      if (!s) return '';
      return validateInput(val);
    };
    const newErrors = {
      interaction: v(editData.interaction),
      houseRules: v(editData.houseRules),
      ownerListingStory: v(editData.ownerListingStory),
    };
    setErrors(newErrors);
    const isValid = !Object.values(newErrors).some((error) => error !== '');
    setIsFormValid(isValid);
    return isValid;
  };

  useEffect(() => {
    if (editMode) {
      validateForm();
    }
  }, [editData, editMode]);

  const handleSave = () => {
    if (!validateForm()) {
      toast.error(t('error_invalid_inputs'));
      return;
    }
    onSave();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <CircularProgress sx={{ color: '#FF6B35' }} size={36} />
        <Typography variant="body1" sx={{ color: '#6b7280', fontWeight: 500 }}>
          {t('loading_descriptions')}
        </Typography>
      </div>
    );
  }

  if (!descriptions) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Typography variant="h6" sx={{ color: '#6b7280', fontWeight: 600 }}>
          {t('no_description_data')}
        </Typography>
        <IconButton
          onClick={onRetry}
          sx={{
            color: '#FF6B35',
            '&:hover': { backgroundColor: '#FFF3E0' },
            padding: '10px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}
        >
          <RefreshIcon sx={{ fontSize: 28 }} />
        </IconButton>
      </div>
    );
  }

  const descriptionCards = [
    {
      title: t('Interaction'),
      field: 'interaction',
      icon: <InteractionIcon sx={{ color: '#FF6B35', fontSize: 28 }} />,
    },
    {
      title: t('House Rules'),
      field: 'houseRules',
      icon: <RulesIcon sx={{ color: '#f97316', fontSize: 28 }} />,
    },
    {
      title: t('Owner Listing Story'),
      field: 'ownerListingStory',
      icon: <StoryIcon sx={{ color: '#FF6B35', fontSize: 28 }} />,
    },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen px-4 py-6">
      <div className="w-full max-w-5xl">
        <Box className="flex items-center justify-between mb-8">
          <Typography
            variant="h4"
            component="h2"
            sx={{ color: '#1f2937', fontWeight: 700 }}
          >
            {t('property_descriptions')}
          </Typography>
          <Box className="flex items-center gap-4">
            <Chip
              label={editMode ? t('editing_mode') : t('view_mode')}
              variant="outlined"
              sx={{
                borderColor: editMode ? '#f97316' : '#FF6B35',
                color: editMode ? '#f97316' : '#FF6B35',
                fontWeight: 600,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
              }}
            />
            <IconButton
              onClick={onRetry}
              sx={{
                color: '#FF6B35',
                '&:hover': { backgroundColor: '#FFF3E0' },
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              <RefreshIcon sx={{ fontSize: 28 }} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ marginTop: '50px' }}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
            {descriptionCards.map((card) => (
              <Card
                key={card.field}
                sx={{
                  backgroundColor: '#ffffff',
                  borderRadius: 3,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  transition: '0.3s',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    transform: 'translateY(-4px)',
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '260px',
                }}
              >
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <Box className="bg-gray-100 p-2 rounded-full shadow-sm">
                      {card.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{ color: '#1f2937', fontWeight: 600 }}
                    >
                      {card.title}
                    </Typography>
                  </div>

                  <Divider sx={{ borderColor: '#e5e7eb', my: 1 }} />

                  {editMode ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={editData[card.field] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onInputChange(card.field, val);
                        setErrors((prev) => ({
                          ...prev,
                          [card.field]: val.trim() ? validateInput(val) : '',
                        }));
                      }}
                      placeholder={t('enter_description', {
                        field: card.title.toLowerCase(),
                      })}
                      variant="outlined"
                      error={!!errors[card.field]}
                      helperText={errors[card.field]}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f3f4f6',
                          borderRadius: '8px',
                          '& fieldset': { borderColor: '#d1d5db' },
                          '&:hover fieldset': {
                            borderColor: card.icon.props.sx.color,
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: card.icon.props.sx.color,
                            boxShadow: `0 0 0 2px ${card.icon.props.sx.color}20`,
                          },
                          '&.Mui-error fieldset': { borderColor: '#ef4444' },
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '0.9rem',
                          color: '#1f2937',
                          padding: '8px',
                        },
                        '& .MuiFormHelperText-root': {
                          color: '#ef4444',
                          fontSize: '0.75rem',
                        },
                      }}
                    />
                  ) : (
                    <Box
                      className="bg-gray-50 p-3 rounded-lg flex-grow"
                      sx={{ minHeight: '100px' }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: descriptions[card.field]
                            ? '#1f2937'
                            : '#9ca3af',
                          fontStyle: descriptions[card.field]
                            ? 'normal'
                            : 'italic',
                          lineHeight: 1.6,
                          fontSize: '0.9rem',
                        }}
                      >
                        {descriptions[card.field] || t('no_content_available')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </Box>

        <Box className="flex justify-center gap-8" sx={{ marginTop: '50px' }}>
          {canUpdate && !editMode ? (
            <Button
              onClick={onEditClick}
              variant="contained"
              startIcon={<EditIcon />}
              sx={{
                backgroundColor: '#FF6B35',
                color: '#ffffff',
                '&:hover': { backgroundColor: '#E55A2B' },
                px: 4,
                py: 1.5,
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
              }}
            >
              {t('Edit Descriptions')}
            </Button>
          ) : canUpdate ? (
            <>
              <Button
                onClick={handleSave}
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress size={16} sx={{ color: '#fff' }} />
                  ) : (
                    <SaveIcon />
                  )
                }
                disabled={saving || !isFormValid}
                sx={{
                  backgroundColor: '#FF6B35',
                  color: '#ffffff',
                  '&:hover': { backgroundColor: '#E55A2B' },
                  px: 4,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
                }}
              >
                {saving ? t('saving') : t('save_changes')}
              </Button>
              <Button
                onClick={onCancelEdit}
                variant="outlined"
                startIcon={<CancelIcon />}
                disabled={saving}
                sx={{
                  borderColor: '#f97316',
                  color: '#f97316',
                  '&:hover': {
                    borderColor: '#e86a00',
                    backgroundColor: '#fff7ed',
                  },
                  px: 4,
                  py: 1.5,
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {t('cancel')}
              </Button>
            </>
          ) : (
            ''
          )}
        </Box>
      </div>
    </div>
  );
};

export default Description;
