import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Search, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Badge = ({ children, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-800 rounded-full !text-xs truncate">
    {children}
    <button
      className="ml-1 hover:text-red-500 focus:outline-none"
      onClick={onRemove}
    >
      <X className="h-3 w-3" />
    </button>
  </span>
);

const ScrollArea = ({ children }) => (
  <div className="overflow-auto max-h-60">{children}</div>
);

const Command = ({ children }) => (
  <div className="border rounded-md shadow-sm bg-white">{children}</div>
);

const CommandInput = ({ placeholder, value, onChange }) => (
  <div className="p-2">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded-md"
    />
  </div>
);

const CommandEmpty = ({ children }) => (
  <div className="p-2 text-gray-500 text-center">{children}</div>
);

const CommandGroup = ({ children }) => <div>{children}</div>;

const CommandItem = ({ children, onSelect }) => (
  <div
    className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer !text-sm"
    onClick={onSelect}
  >
    {children}
  </div>
);

const Popover = ({ open, onOpenChange, children }) => {
  const [isOpen, setIsOpen] = useState(open);
  const popoverRef = useRef(null);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
        onOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onOpenChange]);

  return (
    <div className="relative" ref={popoverRef}>
      {children[0]}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1">
          {children[1]}
        </div>
      )}
    </div>
  );
};

const PopoverTrigger = ({ children, onClick }) => (
  <div onClick={onClick}>{children}</div>
);

const PopoverContent = ({ children }) => (
  <div className="bg-white border rounded-md shadow-lg">{children}</div>
);

const Button = ({ children, onClick, className }) => (
  <button
    type='button'
    onClick={onClick}
    className={`px-4 py-2 border rounded-md ${className}`}
  >
    {children}
  </button>
);

const ListingSelector = ({ listings, selectedIds, onChange, showAllOption = false }) => {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredListings = listings.filter(listing =>
    listing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (listingId) => {
    if (listingId === 'All') {
      onChange(['All']);
    } else {
      const newSelection = selectedIds.includes(listingId)
        ? selectedIds.filter(id => id !== listingId)
        : [...selectedIds, listingId];
      onChange(newSelection.filter(id => id !== 'All'));
    }
  };

  const handleRemove = (listingId) => {
    onChange(selectedIds.filter(id => id !== listingId));
  };

  const getDisplayText = () => {
    if (selectedIds.includes('All')) return t("All listings selected");
    if (selectedIds.length === 0) return t("Select listings...");
    return t("{{count}} listing", { count: selectedIds.length, defaultValue: `${selectedIds.length} listing${selectedIds.length === 1 ? "" : "s"} selected` });
  };

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen} >
        <PopoverTrigger>
          <div
            onClick={() => setOpen(!open)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors flex items-center gap-2"
            style={{ minHeight: '40px' }}
          >
            <Plus className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-700 flex-1">{getDisplayText()}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent>
          <Command>
            <CommandInput 
              placeholder={t("Search listings...")} 
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <CommandGroup>
              <ScrollArea>
                {showAllOption && (
                  <CommandItem onSelect={() => handleSelect('All')}>
                    <span>All Listings</span>
                    {selectedIds.includes('All') && (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </CommandItem>
                )}
                {filteredListings.map((listing) => (
                  <CommandItem
                    key={listing.id}
                    onSelect={() => handleSelect(listing.id)}
                  >
                    <span>{listing.name}</span>
                    {selectedIds.includes(listing.id) && (
                      <Check className="h-4  text-green-600" />
                    )}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedIds.includes('All') ? (
            <Badge onRemove={() => handleRemove('All')}>
              {t("All Listings")}
            </Badge>
          ) : (
            selectedIds.map((id) => {
              const listing = listings.find(l => l.id === id);
              if (!listing) return null;
              
              return (
                <Badge 
                  key={id}
                  onRemove={() => handleRemove(id)}
                >
                  {listing.name}
                </Badge>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ListingSelector;