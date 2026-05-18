import React, { useEffect, useState } from 'react';
import { getChatInbox } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import { Box, Modal, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import ReactJson from 'react-json-view';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import MDBox from 'components/MDBox';
import GlobalFilter from 'components/GlobalFilter/GlobalFilter';
import GlobalPaginationCompact from 'components/GlobalPaginationCompact/GlobalPaginationCompact';
const ChatInbox = () => {
  const {
    t
  } = useTranslation('common');
  const [data, setData] = useState([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [hoveredImage, setHoveredImage] = useState({
    url: null,
    x: 0,
    y: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  useEffect(() => {
    fetchData();
  }, [page, limit]);
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await getChatInbox(page, limit);
      setData(Array.isArray(result.data.data) ? result.data.data : []);
      setTotalItems(result.data.total || 0);
    } catch (error) {
      setData([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
  };
  const handleRowClick = rowData => {
    setSelectedRow(rowData);
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedRow(null);
  };
  const columns = [{
    field: 'id_communication',
    header: t('Communication ID'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.id_communication} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.id_communication}
                    </span>
                </Tooltip>
  }, {
    field: 'phone_number',
    header: t('Phone Number'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.phone_number} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.phone_number}
                    </span>
                </Tooltip>
  }, {
    field: 'source_info',
    header: t('Source Info'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.source_info} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.source_info}
                    </span>
                </Tooltip>
  }, {
    field: 'date',
    header: t('Date'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.date} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.date}
                    </span>
                </Tooltip>
  }, {
    field: 'session_id',
    header: t('Session ID'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.session_id} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.session_id}
                    </span>
                </Tooltip>
  }, {
    field: 'message_type',
    header: t('Message Type'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.message_type} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.message_type}
                    </span>
                </Tooltip>
  }, {
    field: 'message_format',
    header: t('Message Format'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => {
      const messageFormat = rowData.message_format;
      const imageUrl = messageFormat?.image?.url;
      return <Tooltip title={typeof messageFormat === 'object' ? JSON.stringify(messageFormat) : messageFormat} placement="left">
                        <span onClick={() => handleRowClick(rowData)} onMouseEnter={e => imageUrl && setHoveredImage({
          url: imageUrl,
          x: e.clientX,
          y: e.clientY
        })} onMouseLeave={() => setHoveredImage({
          url: null,
          x: 0,
          y: 0
        })} onMouseMove={e => imageUrl && setHoveredImage(prev => ({
          ...prev,
          x: e.clientX,
          y: e.clientY
        }))} style={{
          cursor: 'pointer'
        }}>
                            {imageUrl ? <img src={imageUrl} alt={t('Image Preview')} style={{
            width: '100px',
            height: 'auto'
          }} /> : typeof messageFormat === 'object' ? messageFormat?.flow?.name || JSON.stringify(messageFormat) : messageFormat || ''}
                        </span>
                    </Tooltip>;
    }
  }, {
    field: 'message_text',
    header: t('Message Text'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.message_text} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.message_text}
                    </span>
                </Tooltip>
  }, {
    field: 'translated_text',
    header: t('Translated Text'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.translated_text} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.translated_text}
                    </span>
                </Tooltip>
  }, {
    field: 'message_language',
    header: t('Message Language'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.message_language} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.message_language}
                    </span>
                </Tooltip>
  }, {
    field: 'category',
    header: t('Category'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.category} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.category}
                    </span>
                </Tooltip>
  }, {
    field: 'res_required',
    header: t('Reservation Required'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.res_required} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.res_required}
                    </span>
                </Tooltip>
  }, {
    field: 'agent_needed',
    header: t('Agent Needed'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.agent_needed} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.agent_needed}
                    </span>
                </Tooltip>
  }, {
    field: 'OpenAI_template',
    header: t('OpenAI Template'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.OpenAI_template} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.OpenAI_template}
                    </span>
                </Tooltip>
  }, {
    field: 'reservation_status',
    header: t('Reservation Status'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.reservation_status} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.reservation_status}
                    </span>
                </Tooltip>
  }, {
    field: 'num_reservation',
    header: t('Reservation Number'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.num_reservation} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.num_reservation}
                    </span>
                </Tooltip>
  }, {
    field: 'CONFIG',
    header: t('Config'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.CONFIG} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.CONFIG}
                    </span>
                </Tooltip>
  }, {
    field: 'DESC',
    header: t('Description'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.DESC} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.DESC}
                    </span>
                </Tooltip>
  }, {
    field: 'context',
    header: t('Context'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.context} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.context}
                    </span>
                </Tooltip>
  }, {
    field: 'user_state',
    header: t('User State'),
    headerStyle: {
      width: '5.5rem'
    },
    body: rowData => <Tooltip title={rowData.user_state} placement="left">
                    <span onClick={() => handleRowClick(rowData)} style={{
        cursor: 'pointer'
      }}>
                        {rowData.user_state}
                    </span>
                </Tooltip>
  }];
  return <DashboardLayout>
            <MDBox>
                <Box pt={2} px={4} pb={4} sx={{
        width: '100%',
        typography: 'body1'
      }} className="card">
                    <GlobalFilter filterContent={<div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                    <h5 className="!text-2xl font-bold mr-4">{t('Chat Box')}</h5>
                                </div>
                            </div>} paginationContent={totalItems > 0 ? <GlobalPaginationCompact currentPage={page} totalItems={totalItems} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={setLimit} itemsPerPageOptions={[10, 20, 50]} loading={isLoading} itemType="messages" /> : null} />
                    {isLoading ? <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                            <CircularProgress sx={{
            color: '#00b4b4'
          }} />
                        </Box> : <GlobalTable data={data} columns={columns} page={page} onPageChange={handlePageChange} isNextDisabled={data.length < limit} hasPagination={false} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[10, 20, 50]} />}
                    <Modal open={openModal} onClose={handleCloseModal} aria-labelledby="json-view-title" aria-describedby="json-view-description">
                        <Box sx={{
            width: '80%',
            height: '90vh',
            maxWidth: '800px',
            bgcolor: 'background.paper',
            p: 4,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            overflow: 'auto'
          }}>
                            <Typography id="json-view-title" variant="h6" component="h2">
                                {t('More Details')}
                            </Typography>
                            <IconButton aria-label={t('Close')} onClick={handleCloseModal} sx={{
              position: 'absolute',
              top: 8,
              left: 8
            }}>
                                <CloseIcon />
                            </IconButton>
                            <ReactJson src={selectedRow} collapsed={false} />
                        </Box>
                    </Modal>
                    {hoveredImage.url && <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          transform: `translate(${hoveredImage.x + 20}px, ${hoveredImage.y + 20}px)`
        }}>
                            <img src={hoveredImage.url} alt={t('Enlarged Preview')} style={{
            maxWidth: '400px',
            maxHeight: '400px',
            objectFit: 'contain',
            border: '2px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }} />
                        </Box>}
                </Box>
            </MDBox>
        </DashboardLayout>;
};
export default ChatInbox;
