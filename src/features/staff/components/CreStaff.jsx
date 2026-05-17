import React from 'react';
import { useState } from 'react';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import CreateStaffDialog from './AddStaff';
import { ToastContainer } from 'react-toastify';
const CreStaff = () => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const onStaffCreated = newStaff => {};
  return <div className="w-full h-full">
            <div className='w-full flex justify-between'>
            <span className='text-md font-bold'><Diversity3Icon /> Create new staff</span>
            <span><i className="pi pi-inbox"></i></span>
            </div>
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="w-full h-1/2 flex justify-center items-center border-t-1">
                <button className='px-3 py-2 bg-[#00b4b4] text-white !rounded-md' onClick={handleOpen}>
                    Create Staff
                </button>
                <CreateStaffDialog open={open} handleClose={handleClose} onStaffCreated={onStaffCreated} />
            </div>
        </div>;
};
export default CreStaff;
