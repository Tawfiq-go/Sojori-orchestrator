import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const ConfirmationDialog = ({ open, onClose, onConfirm }) => {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogContent>
                Do you really want to delete ? 
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">Cancel</Button>
                <Button onClick={onConfirm} className="!bg-red-500 !text-white">Delete</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;