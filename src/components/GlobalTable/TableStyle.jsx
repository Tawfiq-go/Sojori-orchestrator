import styled from 'styled-components';

const TableStyle = styled.div`
  .table-container {
    width: 100%;
  }

  @media screen and (max-width: 768px) {
    .table-container {
      overflow-x: scroll;
      -webkit-overflow-scrolling: touch; /* For smooth scrolling on iOS */
    }

    table {
      min-width: 768px; /* Force table to be wider than viewport */
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
    position: sticky;
    top: 0;
    z-index: 1;
    color: #232323 !important;
    font-weight: 500;
    letter-spacing: 0.01em;
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
`;

export default TableStyle;