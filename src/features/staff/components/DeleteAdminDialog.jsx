// import React, { useState } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   Typography,
//   Box,
//   IconButton,
// } from '@mui/material';
// import { User, Lock, Mail, X, Eye, EyeOff } from 'lucide-react';
// import { toast } from 'react-toastify';
// import { deleteStaff } from '../services/serverApi.task';

// const DeleteAdminDialog = ({
//   user,
//   open,
//   onClose,
//   onAdminCreated,
//   title,
//   message,
// }) => {
//   const [isLoading, setIsLoading] = useState(false);
//   const handleSubmit = async () => {

//     setIsLoading(true);
//     try {
//       const response = user?.clerkId && (await deleteStaff(user?.clerkId));

//       if (response) {
//         onAdminCreated();
//         onClose();
//       } else {
//         throw new Error('Unexpected response structure');
//       }
//     } catch (error) {
//       toast.error(
//         (error.response?.data?.error &&
//           error.response?.data?.error.length &&
//           error.response?.data?.error[0]?.message) ||
//           error.response?.data?.message ||
//           'Failed to delete admin',
//       );
//       onClose();
//     } finally {
//       setIsLoading(false);
//       onClose();
//     }
//   };

//   return (
//     <Dialog
//       open={open}
//       onClose={onClose}
//       maxWidth="sm"
//       fullWidth
//       PaperProps={{
//         className: 'rounded-lg',
//       }}
//     >
//       <DialogTitle className="bg-medium-aquamarine flex justify-between items-center">
//         <Typography variant="h6" className="text-white flex items-center gap-2">
//           <User className="w-5 h-5" />
//           {title}
//         </Typography>
//         <IconButton onClick={onClose} className="text-white">
//           <X className="w-5 h-5" />
//         </IconButton>
//       </DialogTitle>
//       <DialogContent className="pt-6">
//         <div className="mt-4">{message}</div>
//         <DialogActions className="pt-4">
//           <Button
//             className="!text-red-500"
//             onClick={onClose}
//             variant="outlined"
//             color="error"
//             startIcon={<X className="w-4 h-4" />}
//           >
//             Cancel
//           </Button>
//           <Button
//             type="submit"
//             disabled={isLoading}
//             className="text-white !bg-medium-aquamarine !hover:bg-medium-aquamarine/90"
//             variant="contained"
//             startIcon={<User className="w-4 h-4" />}
//             onClick={() => handleSubmit()}
//           >
//             {isLoading ? 'deleting...' : 'Delete Admin'}
//           </Button>
//         </DialogActions>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default DeleteAdminDialog;
