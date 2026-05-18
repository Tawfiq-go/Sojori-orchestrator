import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, Button, IconButton, Alert, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Typography, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Add, Remove, ExpandMore, Edit } from '@mui/icons-material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { getUsefulNumber, updateUsefulNumber } from '../services/serverApi.adminConfig';
import { toast, ToastContainer } from 'react-toastify';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
  },
};

const StyledButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
});

const AddButton = styled(IconButton)({
  height: '40px',
  width: '40px',
  borderRadius: '4px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
});

const UsefulNumber = () => {
    const [usefulNumbers, setUsefulNumbers] = useState({});
    const [newCategoryName, setNewCategoryName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingCategory, setEditingCategory] = useState('');
    const [editedCategoryName, setEditedCategoryName] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const { t } = useTranslation('common');

    useEffect(() => {
        fetchUsefulNumbers();
    }, []);

    const fetchUsefulNumbers = async () => {
        setIsLoading(true);
        try {
            const response = await getUsefulNumber();
            if (response.data.usefulNumber && response.data.usefulNumber.usefulNumber) {
                setUsefulNumbers(response.data.usefulNumber.usefulNumber);
            } else {
                setUsefulNumbers({});
            }
        } catch (error) {
            setUsefulNumbers({});
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUsefulNumbers = async () => {
        setIsLoading(true);
        try {
            await updateUsefulNumber({ usefulNumberData: usefulNumbers });
            toast.success(t('Useful Numbers updated successfully'));
        } catch (error) {
            toast.error(t('Error updating Useful Numbers: ') + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) {
            setErrorMessage(t('Please fill in the category name'));
            return;
        }
        if (!usefulNumbers[newCategoryName]) {
            setUsefulNumbers({ ...usefulNumbers, [newCategoryName]: [''] });
            setNewCategoryName('');
            setErrorMessage('');
        } else {
            setErrorMessage(t('Category already exists'));
        }
    };

    const handleAddItem = (categoryName) => {
        setUsefulNumbers({
            ...usefulNumbers,
            [categoryName]: [...usefulNumbers[categoryName], '']
        });
    };

    const handleRemoveItem = (categoryName, index) => {
        setItemToDelete({ type: 'item', categoryName, index });
        setDeleteDialogOpen(true);
    };

    const handleChangeItem = (categoryName, index, value) => {
        const newCategory = [...usefulNumbers[categoryName]];
        newCategory[index] = value;
        setUsefulNumbers({
            ...usefulNumbers,
            [categoryName]: newCategory
        });
    };

    const handleRemoveCategory = (categoryName) => {
        setItemToDelete({ type: 'category', categoryName });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (itemToDelete.type === 'category') {
            const { [itemToDelete.categoryName]: _, ...newUsefulNumbers } = usefulNumbers;
            setUsefulNumbers(newUsefulNumbers);
        } else if (itemToDelete.type === 'item') {
            setUsefulNumbers({
                ...usefulNumbers,
                [itemToDelete.categoryName]: usefulNumbers[itemToDelete.categoryName].filter((_, i) => i !== itemToDelete.index)
            });
        }
        setDeleteDialogOpen(false);
        setItemToDelete(null);
    };

    const startEditingCategory = (categoryName) => {
        setEditingCategory(categoryName);
        setEditedCategoryName(categoryName);
    };

    const handleEditCategoryName = (oldName) => {
        const newName = editedCategoryName.trim();
        if (oldName === newName || !newName) {
            setEditingCategory('');
            setEditedCategoryName('');
            return;
        }
        if (usefulNumbers[newName]) {
            setErrorMessage(t('Category already exists'));
            return;
        }
        const { [oldName]: categoryNumbers, ...rest } = usefulNumbers;
        setUsefulNumbers({
            ...rest,
            [newName]: categoryNumbers
        });
        setEditingCategory('');
        setEditedCategoryName('');
    };

    return (
        <div className="card px-4 pb-4 !border-none">
            <ToastContainer />
            <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="text-2xl font-bold">{t('Useful Numbers')}</Typography>
                <div className="flex items-center gap-2">
                    <TextField
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('New Category')}
                        variant="outlined"
                        size="small"
                        sx={{ width: '200px' }}
                    />
                    <AddButton
                        onClick={handleAddCategory}
                        disabled={isLoading}
                    >
                        <AddCircleIcon />
                    </AddButton>
                    <StyledButton
                        variant="contained"
                        onClick={handleUpdateUsefulNumbers}
                        disabled={isLoading}
                    >
                        {isLoading ? t('Saving...') : t('Save')}
                    </StyledButton>
                </div>
            </div>
            {errorMessage && <Alert severity="error" className="!mb-4" onClose={() => setErrorMessage('')}>{errorMessage}</Alert>}
            {Object.entries(usefulNumbers).map(([categoryName, numbers]) => (
                <Accordion key={categoryName} className="mb-4">
                    <AccordionSummary
                        expandIcon={<ExpandMore className="!text-white" />}
                        aria-controls={`${categoryName}-content`}
                        id={`${categoryName}-header`}
                        className="!bg-[#6fd1bd] text-white"
                    >
                        <div className="flex items-center w-full gap-2">
                            <span className="text-sm ml-2 bg-white text-[#6fd1bd] px-2 py-1 rounded-full">
                                {numbers.length}
                            </span>
                            {editingCategory === categoryName ? (
                                <TextField
                                    value={editedCategoryName}
                                    onChange={(e) => setEditedCategoryName(e.target.value)}
                                    onBlur={() => handleEditCategoryName(categoryName)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleEditCategoryName(categoryName);
                                        }
                                    }}
                                    autoFocus
                                    variant="standard"
                                    className="!text-white"
                                    InputProps={{
                                        style: { color: 'white' }
                                    }}
                                />
                            ) : (
                                <>
                                    <span className="font-semibold text-md">{categoryName}</span>
                                    <IconButton onClick={() => startEditingCategory(categoryName)} size="small" className="!text-white ml-auto">
                                        <Edit fontSize="small" />
                                    </IconButton>
                                </>
                            )}
                        </div>
                        <Button
                            startIcon={<DeleteIcon />}
                            onClick={() => handleRemoveCategory(categoryName)}
                            disabled={isLoading}
                            className="!text-white"
                        >
                        </Button>
                    </AccordionSummary>
                    <AccordionDetails>
                        <div>
                            <div className="flex justify-between gap-2 my-4">
                                <StyledButton
                                    variant="outlined"
                                    startIcon={<Add />}
                                    onClick={() => handleAddItem(categoryName)}
                                    disabled={isLoading}
                                    sx={{
                                        borderColor: SOJORI_COLORS.primary,
                                        backgroundColor: SOJORI_COLORS.primary,
                                        color: 'white',
                                        '&:hover': {
                                            borderColor: SOJORI_COLORS.primaryDark,
                                            backgroundColor: SOJORI_COLORS.primaryDark,
                                            color: 'white',
                                        }
                                    }}
                                >
                                    {t('Add Number')}
                                </StyledButton>
                            </div>
                            {numbers.map((item, index) => (
                                <div key={index} className="flex items-center mb-2">
                                    <TextField
                                        value={item}
                                        onChange={(e) => handleChangeItem(categoryName, index, e.target.value)}
                                        placeholder={`${t('Number')} ${index + 1}`}
                                        variant="outlined"
                                        fullWidth
                                        disabled={isLoading}
                                    />
                                    <IconButton
                                        onClick={() => handleRemoveItem(categoryName, index)}
                                        color="error"
                                        disabled={isLoading}
                                    >
                                        <Remove />
                                    </IconButton>
                                </div>
                            ))}
                        </div>
                    </AccordionDetails>
                </Accordion>
            ))}

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{t('Confirm Deletion')}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {itemToDelete?.type === 'category'
                            ? t('Are you sure you want to delete the category "${categoryName}" and all its numbers?', { categoryName: itemToDelete.categoryName })
                            : t('Are you sure you want to delete this number?')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
                        {t('Cancel')}
                    </Button>
                    <Button onClick={handleConfirmDelete} color="primary" autoFocus>
                        {t('Confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default UsefulNumber;