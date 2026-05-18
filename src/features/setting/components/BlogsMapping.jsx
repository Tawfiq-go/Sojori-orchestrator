import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Reorder, AnimatePresence } from 'framer-motion';
import { CircularProgress, Typography, Button, Tooltip } from '@mui/material';
import { getBlogsMappig, updateBlogsMapping, getLanguages } from '../services/serverApi.adminConfig';
import AddIcon from '@mui/icons-material/Add';
import AddBlogDialog from './AddBlogMapping.component';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import { toast, ToastContainer } from 'react-toastify';
function BlogsMap() {
  const {
    t
  } = useTranslation('common');
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await getBlogsMappig();
      setBlogs(response?.data?.blogsMapping);
    } catch (error) {
      setError(t('Failed to fetch blogs. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {}
  };
  useEffect(() => {
    fetchBlogs();
    fetchLanguages();
  }, []);
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);
  const onDelete = async id => {
    try {
      const filteredBlogs = blogs.filter(blog => blog.blog._id !== id);
      const newMapping = filteredBlogs.map(blog => blog.blog._id);
      setBlogs(filteredBlogs);
      window.confirm(t('Are you sure you want to delete this blog?'));
      await updateBlogsMapping({
        blogsMapping: newMapping
      });
      toast.success(t('Blog deleted successfully'));
    } catch (error) {}
  };
  const handleReorder = async newOrder => {
    const newMapping = newOrder.map(blog => blog.blog._id);
    setBlogs(newOrder);
    try {
      await updateBlogsMapping({
        blogsMapping: newMapping
      });
    } catch (error) {}
  };
  const renderMultiLanguageContent = content => {
    if (typeof content !== 'object') {
      return <span>{content}</span>;
    }
    return <div>
        {Object.entries(content).map(([langId, text]) => {
        const language = languages.find(lang => lang._id === langId);
        return <Tooltip key={langId} title={text} arrow placement="top">
              <div>
                <strong>{language ? language.name : 'Unknown'}:</strong>{' '}
                {text.length > 50 ? `${text.substring(0, 50)}...` : text}
              </div>
            </Tooltip>;
      })}
      </div>;
  };
  const columns = [{
    header: t("Image"),
    body: rowData => <img src={rowData.blog.imageUrl} alt={Object.values(rowData.blog.title)[0]} style={{
      width: '140px',
      height: 'auto'
    }} />
  }, {
    header: t("City Name"),
    body: rowData => <span>{rowData.blog.cityName}</span>
  }, {
    header: t("Title"),
    body: rowData => renderMultiLanguageContent(rowData.blog.title)
  }, {
    header: t("Description"),
    body: rowData => renderMultiLanguageContent(rowData.blog.description)
  }, {
    header: t("Action"),
    body: rowData => <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => onDelete(rowData.blog._id)}>
          <DeleteSweepIcon className="text-white" />
        </button>
  }];
  if (error) {
    return <div className="flex items-center justify-center w-full h-64 text-red-500">{error}</div>;
  }
  return <div className="card p-4 !border-none">
      <ToastContainer />
      <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
        {t('Blogs Mapping')}
      </Typography>
      <div className="mb-4">
        <Button startIcon={<AddIcon />} onClick={handleOpenDialog} className="float-right !bg-medium-aquamarine text-white">
          {t('Add Blog')}
        </Button>
      </div>
      <div>
        <div className="w-full">
          {loading ? <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
              <CircularProgress style={{
            color: '#00b4b4'
          }} />
            </div> : <AnimatePresence>
              <Reorder.Group axis="y" values={blogs} onReorder={handleReorder}>
                <GlobalTable data={blogs} columns={columns} hasPagination={false} isLoading={loading} customRowComponent={props => <Reorder.Item key={props.rowData.blog._id} value={props.rowData} as="tr">
                      {props.children}
                    </Reorder.Item>} />
              </Reorder.Group>
            </AnimatePresence>}
        </div>
      </div>
      <AddBlogDialog open={openDialog} onClose={handleCloseDialog} setBlogs={setBlogs} blogs={blogs} func={fetchBlogs} />
    </div>;
}
export default BlogsMap;
