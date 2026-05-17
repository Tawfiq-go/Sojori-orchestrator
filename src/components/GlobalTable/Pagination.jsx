import React from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { useTranslation } from 'react-i18next';

const Pagination = ({ page, onPageChange, isNextDisabled, limit, onLimitChange, rowsPerPageOptions }) => {
    const handleNextPage = () => {
        onPageChange(page + 1);
    };
const { t } = useTranslation('common');

    const handlePreviousPage = () => {
        if (page > 0) {
            onPageChange(page - 1);
        }
    };

    const handleLimitChange = (e) => {
        onLimitChange(e.value);
        onPageChange(0);  
    };

    return (
        <div className="flex items-center justify-between mt-2 !px-2">
            <div className="flex items-center gap-2">
                <Button
                    className="px-2 py-1 bg-[#dcf6f6] !rounded-sm max-sm:p-1"
                    onClick={handlePreviousPage}
                    disabled={page === 0}
                    icon="pi pi-chevron-left"
                    tooltip="Previous"
                    tooltipOptions={{ position: 'top' }}
                />
                <span className="text-[#00b4b4] !text-sm font-semibold max-sm:text-xs">{t('Page')}{page + 1}</span>
                <Button
                    className="px-2 py-1 bg-[#dcf6f6] !rounded-sm max-sm:p-1"
                    onClick={handleNextPage}
                    disabled={isNextDisabled}
                    icon="pi pi-chevron-right"
                    tooltip="Next"
                    tooltipOptions={{ position: 'top' }}
                />
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[#00b4b4] !p-1 text-sm font-semibold whitespace-nowrap max-sm:text-xs">{t('Rows per page:')}</span>
                <Dropdown 
                    value={limit} 
                    options={rowsPerPageOptions} 
                    onChange={handleLimitChange} 
                    className="w-[4.8rem] !p-1 max-sm:w-[4rem]" 
                    panelClassName="text-base"
                    pt={{
                        item: { className: '!p-1 !text-sm max-sm:!text-xs' }  
                    }}
                />
            </div>
        </div>
    );
};

export default Pagination;