import React, { useMemo, useRef, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Table as MuiTable, TableHead as MuiTableHead, TableBody as MuiTableBody, TableRow as MuiTableRow, TableCell as MuiTableCell } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
/** Financial totals non utilisés dans Équipe & Rôles */
const TotalRevenueTable = () => null;
import styled, { css } from 'styled-components';

const TableContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$dense',
})`
  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    /* Remove max-height and vertical scroll */
    /* max-height: 600px; */
    /* overflow-y: auto; */
    height: auto;
  }

  .totals-wrapper {
    width: 100%;
    overflow-x: auto;
    border-top: 1px solid #dfe1e6;
  }

  @media screen and (max-width: 768px) {
    .table-wrapper,
    .totals-wrapper {
      -webkit-overflow-scrolling: touch;
    }

    table {
      min-width: 768px;
    }
  }

  table {
    table-layout: fixed;
  }
    
  tr {
    background-color: white;
    color: black;
    border-bottom: 1px solid #dfe1e6;
  }

  td,
  th {
    font-size: 14px;
    border: none;
    white-space: nowrap; 
    text-align: start;
    padding: 8px; 
    overflow: hidden;
    text-overflow: ellipsis; 
  }

  td {
    height: 60px;
  }

  th {
    background: #f2f7fa;
    border-bottom: 1px solid #dfe1e6;
    min-width: 150px;
    width: 150px;
    max-width: 150px;
    height: 50px;
    /* Make headers sticky */
    position: sticky;
    top: 0;
    z-index: 1;
    color: #232323 !important;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  th .p-column-header-content, th .p-column-title, th .p-column-title span, th .p-column-title div, th span, th div {
    color: #232323 !important;
  }

  @media screen and (max-width: 768px) {
    th,
    td {
      min-width: 106px;
      width: 106px;
      max-width: 106px;
    }
  }

  .p-sortable-column .p-sortable-column-icon {
    color: #808080; 
  }

  .p-sortable-column:hover .p-sortable-column-icon {
    color: #606060; 
  }

  .p-sortable-column.p-highlight .p-sortable-column-icon {
    color: #404040;
  }

  .total-row {
    background-color: #f8f9fa !important;
    border-top: 1px solid #dfe1e6;
  }

  ${(p) =>
    p.$dense &&
    css`
      .table-wrapper td {
        height: 34px !important;
        padding: 2px 8px !important;
        font-size: 12px !important;
        line-height: 1.25 !important;
      }
      .table-wrapper th {
        height: 30px !important;
        min-width: 72px !important;
        width: auto !important;
        max-width: 280px !important;
        padding: 4px 8px !important;
        font-size: 10px !important;
        font-weight: 700 !important;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        background: linear-gradient(180deg, #fff7ed 0%, #ffffff 45%, #fffaf5 100%) !important;
        color: #0f172a !important;
        border-bottom: 2px solid #ff6b35 !important;
        box-shadow: inset 0 1px 0 rgba(255, 107, 53, 0.12);
      }
      .table-wrapper th * {
        color: #0f172a !important;
      }
      .table-wrapper tr:hover td {
        background: rgba(255, 107, 53, 0.06) !important;
      }
    `}
`;

const GlobalTable = ({
  data,
  columns,
  page,
  onPageChange,
  isNextDisabled,
  hasPagination,
  limit = 20, 
  onLimitChange,
  rowsPerPageOptions,
  totalRevenue,
  totals,
  onRowClick,
  disableSorting = false,
  /** Ultra-compact table (dense rows + Sojori orange header) — admin owners, etc. */
  dense = false,
}) => {
  const { t } = useTranslation('common');
  const mainTableRef = useRef(null);
  const [sortField, setSortField] = useState('isUnmapped');
  const [sortOrder, setSortOrder] = useState(-1); // -1 desc, 1 asc, 0 none

  const rowClassName = (rowData) => {
    if (rowData.isTotal) {
      return 'total-row font-bold';
    }
    return {
      '!bg-red-100': rowData.isUnmapped,
      '!cursor-pointer': rowData.isUnmapped
    };
  };

  // const shouldEnableScroll = data.length > limit;

  const dataWithTotals = [...(data || [])].filter(Boolean);
  if (totals) {
    const totalsRow = columns.reduce((acc, col) => {
      if (col.field === 'name' || col.field === 'guestName') {
        acc[col.field] = 'Total';
      } else if (col.field === 'totalRevenue') {
        acc[col.field] = totals.totalRevenue;
      } else if (col.field === 'fees') {
        acc[col.field] = totals.totalFees;
      } else if (col.field === 'nightsBooked') {
        acc[col.field] = totals.totalNightsBooked;
      } else if (col.field === 'totalCheckIns') {
        acc[col.field] = totals.totalCheckIns;
      } else if (col.field === 'nightsAvailable') {
        acc[col.field] = totals.totalNightsAvailable;
      } else if (col.field === 'occupancyRate') {
        acc[col.field] = totals.averageOccupancyRate;
      } else if (col.field === 'revenuePerNightBooked') {
        acc[col.field] = totals.revenuePerNightBooked;
      } else if (col.field === 'revenuePerNightAvailable') {
        acc[col.field] = totals.revenuePerNightAvailable;
      } else if (col.field === 'averageNightlyRate') {
        acc[col.field] = totals.averageNightlyRate;
      } else if (col.field === 'averageRevenuePerStay') {
        acc[col.field] = totals.averageRevenuePerStay;
      } else if (col.field === 'cancelations') {
        acc[col.field] = totals.totalCancelations;
      } else if (col.field === 'cancelationsPercentage') {
        acc[col.field] = totals.totalCancelationsPercentage;
      }
      return acc;
    }, { isTotal: true });
    dataWithTotals.push(totalsRow);
  }

  const getSortIcon = (field) => {
    if (sortField !== field || sortOrder === 0) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
          <ChevronDown size={16} color="#b0b0b0" fontWeight={900} />
        </span>
      );
    }
    if (sortOrder === 1) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
          <ChevronUp size={16} color="#00b4b4" fontWeight={900} />
        </span>
      );
    }
    return (
      <span style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
        <ChevronDown size={16} color="#00b4b4" fontWeight={900} />
      </span>
    );
  };

  const handleHeaderClick = (col) => {
    if (disableSorting) return;
    const isSortable = typeof col.sortable !== 'undefined' ? col.sortable : (!['details', 'calendar', 'contact', 'message'].includes(col.uniqueId));
    if (!isSortable) return;
    if (sortField !== col.field) {
      setSortField(col.field);
      setSortOrder(-1);
      return;
    }
    setSortOrder((prev) => {
      if (prev === -1) return 1;
      if (prev === 1) return 0;
      return -1;
    });
  };

  const sortedRows = useMemo(() => {
    const rows = dataWithTotals.filter(r => r && !r.isTotal);
    const totalsOnly = dataWithTotals.filter(r => r && r.isTotal);
    if (!sortField || sortOrder === 0 || disableSorting) {
      return [...rows, ...totalsOnly];
    }
    const getVal = (row) => row?.[sortField];
    const comparator = (a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return va - vb;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    };
    rows.sort((a, b) => comparator(a, b) * (sortOrder === -1 ? -1 : 1));
    return [...rows, ...totalsOnly];
  }, [dataWithTotals, sortField, sortOrder, disableSorting]);

  const normalizeRowClassName = (rowData) => {
    const rc = rowClassName(rowData);
    if (!rc) return undefined;
    if (typeof rc === 'string') return rc;
    if (typeof rc === 'object') {
      return Object.entries(rc)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k)
        .join(' ');
    }
    return undefined;
  };

  return (
    <TableContainer $dense={dense}>
      <div ref={mainTableRef}>
        <div className="table-wrapper" style={{ height: 'auto', maxHeight: 'none', overflowY: 'visible' }}>
          <MuiTable size="small" stickyHeader>
            <MuiTableHead>
              <MuiTableRow>
                {columns.map((col, index) => {
                  const isSortable = typeof col.sortable !== 'undefined' ? col.sortable : (!['details', 'calendar', 'contact', 'message'].includes(col.uniqueId));
                  return (
                    <MuiTableCell
                      key={index}
                      onClick={() => handleHeaderClick(col)}
                      style={{
                        minWidth: col.width || '150px',
                        width: col.width || '150px',
                        maxWidth: col.width || '150px',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        cursor: isSortable && !disableSorting ? 'pointer' : 'default',
                        ...(col.headerStyle || {}),
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: (col.headerStyle && col.headerStyle.justifyContent) ? col.headerStyle.justifyContent : 'center', textAlign: 'center', width: '100%', gap: 8 }}>
                        <div style={{ flex: (col.headerStyle && col.headerStyle.justifyContent) ? '0 1 auto' : '0 0 auto' }}>{col.header}</div>
                        {isSortable && !disableSorting && getSortIcon(col.field)}
                      </div>
                    </MuiTableCell>
                  );
                })}
              </MuiTableRow>
            </MuiTableHead>
            <MuiTableBody>
              {sortedRows.length === 0 ? (
                <MuiTableRow>
                  <MuiTableCell 
                    colSpan={columns.length} 
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: '#6b7280',
                      fontSize: '16px',
                      fontWeight: 500,
                      borderBottom: 'none',
                    }}
                  >
                    {t('No data found')}
                  </MuiTableCell>
                </MuiTableRow>
              ) : (
                sortedRows.map((row, rowIndex) => (
                  <MuiTableRow
                    key={rowIndex}
                    className={normalizeRowClassName(row)}
                    hover
                    onClick={() => !row.isTotal && onRowClick && onRowClick(row)}
                    style={{ cursor: !row.isTotal && onRowClick ? 'pointer' : 'default' }}
                  >
                    {columns.map((col, colIndex) => {
                      const content = typeof col.body === 'function' ? col.body(row) : row[col.field];
                      const fontWeight = row.isTotal ? 'bold' : 'normal';
                      return (
                        <MuiTableCell
                          key={`${rowIndex}-${colIndex}`}
                          style={{
                            minWidth: col.width || '150px',
                            width: col.width || '150px',
                            maxWidth: col.width || '150px',
                            fontWeight,
                            textAlign: 'left',
                            borderBottom: '1px solid #dfe1e6',
                            ...(col.bodyStyle || {}),
                          }}
                        >
                          {content}
                        </MuiTableCell>
                      );
                    })}
                  </MuiTableRow>
                ))
              )}
            </MuiTableBody>
          </MuiTable>
        </div>
      </div>

      {hasPagination && (
        <Pagination
          page={page}
          onPageChange={onPageChange}
          isNextDisabled={isNextDisabled}
          limit={limit}
          onLimitChange={onLimitChange}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      )}
    </TableContainer>
  );
};

export default GlobalTable;