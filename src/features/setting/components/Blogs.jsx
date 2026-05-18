import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getblogs, removeblog, updateblog, getLanguages } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import AddBlogDialog from './AddBlog.component';
import ModifyBlogDialog from './ModifyBlog.component';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Typography, CircularProgress, Button, Switch, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function BlogsTable() {
  const {
    t
  } = useTranslation('common');
  const [blogs, setBlogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openModifyDialog, setOpenModifyDialog] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [selectedBlogIndex, setSelectedBlogIndex] = useState(null);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  useEffect(() => {
    fetchBlogs();
    fetchLanguages();
  }, []);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed to fetch languages'));
    }
  };
  const fetchBlogs = async () => {
    setIsLoading(true);
    try {
      const response = await getblogs();
      setBlogs(response.data);
      setError(null);
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };
  const handleOpenAddDialog = () => setOpenAddDialog(true);
  const handleCloseAddDialog = () => setOpenAddDialog(false);
  const handleOpenModifyDialog = (blog, index) => {
    setSelectedBlog(blog);
    setSelectedBlogIndex(index);
    setOpenModifyDialog(true);
  };
  const handleCloseModifyDialog = () => {
    setSelectedBlog(null);
    setSelectedBlogIndex(null);
    setOpenModifyDialog(false);
  };
  const handleDeleteBlog = async blogId => {
    if (window.confirm(t('Are you sure you want to delete this blog?'))) {
      try {
        await removeblog(blogId);
        setBlogs(blogs.filter(blog => blog._id !== blogId));
        toast.success(t('Blog deleted successfully'));
      } catch (error) {
        toast.error(t('Failed to delete blog'));
      }
    }
  };
  const addBlog = newBlog => {
    setBlogs([...blogs, newBlog]);
    handleCloseAddDialog();
  };
  const handleUpdateBlog = updatedBlog => {
    const updatedBlogs = [...blogs];
    updatedBlogs[selectedBlogIndex] = updatedBlog;
    setBlogs(updatedBlogs);
  };
  const handleSwitchToggle = async (blog, index) => {
    const updatedBlog = {
      ...blog,
      displayed: !blog.displayed
    };
    try {
      await updateblog(blog._id, updatedBlog);
      const updatedBlogs = [...blogs];
      updatedBlogs[index] = updatedBlog;
      setBlogs(updatedBlogs);
      toast.success(t("Display status updated"));
    } catch (error) {
      toast.error(t("Failed to update display status"));
    }
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
    body: rowData => <img src={rowData.imageUrl} alt="Blog" style={{
      width: '100px',
      height: 'auto'
    }} />
  }, {
    header: t("City"),
    body: rowData => <span>{rowData.cityName}</span>
  }, {
    header: t("Zone"),
    body: rowData => <span>{rowData.ZoneName}</span>
  }, {
    header: t("Title"),
    body: rowData => renderMultiLanguageContent(rowData.title)
  }, {
    header: t("Description"),
    body: rowData => renderMultiLanguageContent(rowData.description)
  }, {
    header: t("Displayed"),
    body: (rowData, rowIndex) => <Switch checked={rowData.displayed} onChange={() => handleSwitchToggle(rowData, rowIndex)} />
  }, {
    header: t("Action"),
    body: (rowData, rowIndex) => <div className="flex gap-1">
          <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenModifyDialog(rowData, rowIndex)}>
            <EditOffIcon className="text-white" />
          </button>
          <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDeleteBlog(rowData._id)}>
            <DeleteSweepIcon className="text-white" />
          </button>
        </div>
  }];
  if (error) {
    return <div className="flex items-center justify-center w-full h-64 text-red-500">{error}</div>;
  }
  return <div className="card p-4 !border-none">
      <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
        {t('Blogs Management')}
      </Typography>
      <div className="mb-4">
        <Button startIcon={<AddIcon />} onClick={handleOpenAddDialog} className="float-right !bg-medium-aquamarine text-white">
          {t('Add Blog')}
        </Button>
      </div>
      <div>
        <div className="w-full">
          {isLoading ? <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
              <CircularProgress style={{
            color: '#00b4b4'
          }} />
            </div> : <GlobalTable data={blogs} columns={columns} hasPagination={false} />}
        </div>
      </div>
      <AddBlogDialog open={openAddDialog} onClose={handleCloseAddDialog} addBlog={addBlog} />
      <ModifyBlogDialog open={openModifyDialog} onClose={handleCloseModifyDialog} onUpdateBlog={handleUpdateBlog} dataBlog={selectedBlog} />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>;
}
export default BlogsTable;
