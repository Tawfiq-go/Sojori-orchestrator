import React from 'react';
import FilterSearch from 'components/FilterSearch/FilterSearch';
import { Select, MenuItem, FormControl } from '@mui/material';
import { useTranslation } from 'react-i18next';

const GlobalFilterOld = ({
  showCountry = true,
  showCity = true,
  showListing = true,
  showActive = true,
  showOtherFilters = true,
  otherFilters = [],
  selectedCountries = [],
  selectedCities = [],
  selectedListings = [],
  activeStatus = ['true'],
  countries = [],
  cities = [],
  listingOptions = [],
  onCountryChange,
  onCityChange,
  onListingChange,
  onActiveChange,
}) => {
  const { t } = useTranslation('common');
  const statusOptions = [
    { id: 'true', name: t('Active') },
    { id: 'false', name: t('Inactive') },
  ];

  return (
    <div className="flex items-center gap-2">
      {showCountry && (
        <FilterSearch
          selectedItems={selectedCountries}
          options={countries}
          onItemsChange={onCountryChange}
          placeholder={t("Select Countries")}
          idKey="name"
          labelKey="name"
        />
      )}

      {showCity && (
        <FilterSearch
          selectedItems={selectedCities}
          options={cities}
          onItemsChange={onCityChange}
          placeholder={t("Select Cities")}
          idKey="_id"
          labelKey="name"
        />
      )}

      {showListing && (
        <FilterSearch
          selectedItems={selectedListings}
          options={listingOptions}
          onItemsChange={onListingChange}
          placeholder={t("Select Listings")}
          idKey="id"
          labelKey="name"
        />
      )}

      {showActive && (
        <FilterSearch
          selectedItems={activeStatus}
          options={statusOptions}
          onItemsChange={onActiveChange}
          placeholder={t("Select Status")}
          idKey="id"
          labelKey="name"
        />
      )}

      {showOtherFilters &&
        otherFilters.map((filter, index) => (
          <FilterSearch
            key={index}
            selectedItems={filter.selectedItems}
            options={filter.options}
            onItemsChange={filter.onChange}
            placeholder={t(filter.placeholder)}
            idKey={filter.idKey || 'id'}
            labelKey={filter.labelKey || 'name'}
          />
        ))}
    </div>
  );
};

export default GlobalFilterOld;
