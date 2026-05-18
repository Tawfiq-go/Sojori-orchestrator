import React, { useState } from 'react';

const DynamicFieldButtons = ({ availableFields, insertField, isEnglish }) => {
    const [showAll, setShowAll] = useState(false);
    const displayLimit = 4;

    const toggleShowAll = () => {
        setShowAll(!showAll);
    };

    const displayedFields = showAll 
        ? availableFields 
        : availableFields.slice(0, displayLimit);

    return (
        <div className="flex flex-wrap gap-2">
            {displayedFields.map((field) => (
                <button
                    key={field.value}
                    onClick={() => insertField(field, isEnglish)}
                    className="px-3 py-1 border !border-blue-400 text-blue-400 rounded-full !text-sm hover:border-blue-600"
                >
                    + {field.label}
                </button>
            ))}
            {!showAll && availableFields.length > displayLimit && (
                <button
                    onClick={toggleShowAll}
                    className="px-3 py-1 border !border-gray-400 text-gray-600 rounded-full !text-sm hover:bg-gray-100"
                >
                    ...
                </button>
            )}
            {showAll && (
                <button
                    onClick={toggleShowAll}
                    className="px-3 py-1 border !border-gray-400 text-gray-600 rounded-full !text-sm hover:bg-gray-100"
                >
                    Hide
                </button>
            )}
        </div>
    );
};

export default DynamicFieldButtons;