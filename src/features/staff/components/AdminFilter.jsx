import React, { useState } from 'react';
import { Switch, Tooltip, Menu, MenuItem } from '@mui/material';
import { Trash2, Ban, Filter, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminFilter = ({
    deletedFilter,
    bannedFilter,
    onDeletedChange,
    onBannedChange
}) => {
    const { t } = useTranslation('common');
    const [anchorEl, setAnchorEl] = useState(null);
    const [isFilterActive, setIsFilterActive] = useState(false);

    const handleFilterClick = (event) => {
        setAnchorEl(event.currentTarget);
        setIsFilterActive(true);
    };

    const handleFilterClose = () => {
        setAnchorEl(null);
        setIsFilterActive(false);
    };

    return (
        <div className="flex items-center space-x-4">
            <div className="relative">
                <Tooltip title={t('Filter Administrators')} arrow>
                    <button
                        onClick={handleFilterClick}
                        className={`
                            flex items-center justify-center 
                            px-3 py-2 !rounded-full transition-all duration-300
                            ${isFilterActive 
                                ? 'bg-blue-100 text-blue-600 shadow-md' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                        `}
                    >
                        <Filter className="w-5 h-5 mr-1" />
                        <ChevronDown 
                            className={`w-4 h-4 transition-transform ${anchorEl ? 'rotate-180' : ''}`} 
                        />
                    </button>
                </Tooltip>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleFilterClose}
                    className="mt-2"
                    PaperProps={{
                        className: "rounded-lg shadow-xl border border-gray-100"
                    }}
                >
                    <MenuItem className="hover:bg-gray-50">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1">
                                <Trash2
                                    className={`w-5 h-5 ${deletedFilter === 'true' 
                                        ? 'text-red-500' 
                                        : 'text-gray-400'}`}
                                    strokeWidth={2}
                                />
                                <span>{t('Show Deleted')}</span>
                            </div>
                            <Switch
                                checked={deletedFilter === 'true'}
                                onChange={(e) => onDeletedChange(e.target.checked ? 'true' : 'false')}
                                color="error"
                                size="small"
                            />
                        </div>
                    </MenuItem>
                    <MenuItem className="hover:bg-gray-50">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1">
                                <Ban
                                    className={`w-5 h-5 ${bannedFilter === 'true' 
                                        ? 'text-red-500' 
                                        : 'text-gray-400'}`}
                                />
                                <span>{t('Show Banned')}</span>
                            </div>
                            <Switch
                                checked={bannedFilter === 'true'}
                                onChange={(e) => onBannedChange(e.target.checked ? 'true' : 'false')}
                                color="error"
                                size="small"
                            />
                        </div>
                    </MenuItem>
                </Menu>
            </div>
        </div>
    );
};

export default AdminFilter;