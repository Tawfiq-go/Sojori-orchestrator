// import React, { useState, useEffect } from 'react';
// import { Box, Button, CircularProgress } from '@mui/material';
// import { AddCircleOutline as AddIcon } from '@mui/icons-material';
// import { ToastContainer } from 'react-toastify';
// import TagDialog from './TagsDialog';
// import { getTags } from '../services/serverApi.adminConfig';

// const Tags = () => {
//     const [tags, setTags] = useState([]);
//     const [showDialog, setShowDialog] = useState(false);
//     const [selectedTag, setSelectedTag] = useState(null);
//     const [isLoading, setIsLoading] = useState(true);

//     useEffect(() => {
//         fetchData();
//     }, []);

//     const fetchData = async () => {
//         try {
//             const data = await getTags();
//             setTags(data || []);
//         } catch (error) {
//             setTags([]);
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleCreateTag = () => {
//         setSelectedTag(null);
//         setShowDialog(true);
//     };

//     const handleUpdateTag = (tag) => {
//         setSelectedTag(tag);
//         setShowDialog(true);
//     };

//     const handleTagChange = (updatedTag) => {
//         if (selectedTag) {
//             const updatedTags = tags.map((tag) =>
//                 tag._id === updatedTag._id ? updatedTag : tag
//             );
//             setTags(updatedTags);
//         } else {
//             const updatedTags = [...tags, updatedTag];
//             setTags(updatedTags);
//         }
//         setShowDialog(false);
//     };

//     return (
//         <>
//             <ToastContainer />
//             <div className="card p-4">
//                 <Box className="text-center mb-4">
//                     <Button
//                         variant="contained"
//                         className="!bg-medium-aquamarine text-white"
//                         endIcon={<AddIcon />}
//                         onClick={handleCreateTag}
//                     >
//                         Create Tag
//                     </Button>
//                 </Box>
//                 {isLoading ? (
//                     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
//                         <CircularProgress style={{ color: '#00b4b4' }} />
//                     </div>
//                 ) : (
//                     <div className="grid grid-cols-9 gap-4">
//                         {tags.map((tag) => (
//                             <div
//                                 key={tag._id}
//                                 className="border rounded p-4 flex justify-center text-black flex-col w-[6rem] h-[3rem] items-center cursor-pointer hover:text-white hover:shadow-md hover:bg-medium-aquamarine transition duration-300 hover:animate-pulse"
//                                 onClick={() => handleUpdateTag(tag)}
//                             >
//                                 <h6 className="font-bold m-0" style={{ fontSize: '13px !important' }}>{tag.name}</h6>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//                 <TagDialog
//                     showDialog={showDialog}
//                     onClose={() => setShowDialog(false)}
//                     tag={selectedTag}
//                     onTagChange={handleTagChange}
//                 />
//             </div>
//         </>
//     );
// };

// export default Tags;
