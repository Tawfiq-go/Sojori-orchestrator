import { useEffect, useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useAmenities } from '../../../../contexts/AmenitiesContext';

interface AmenityCategoriesProps {
  selectedTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const T = {
  bg1: '#ffffff',
  bg2: '#f8f9fa',
  border: '#e2e8f0',
  text: '#1a1408',
  text2: '#64748b',
  text3: '#94a3b8',
  accent: '#b8851a',
  accentHover: '#8f6814',
};

const DEFAULT_CATEGORIES = [
  'All Categories',
  'Basic',
  'Kitchen',
  'Bathroom',
  'Bedroom',
  'Living Room',
  'Outdoor',
  'Entertainment',
  'Safety',
  'Services',
];

export function AmenityCategories({ selectedTab, onTabChange }: AmenityCategoriesProps) {
  const { getPredefinedCategories } = useAmenities();
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await getPredefinedCategories();
        if (fetchedCategories && fetchedCategories.length > 0) {
          // Ensure "All Categories" is first if not present
          const hasAll = fetchedCategories.some(
            (cat) => cat.toLowerCase() === 'all categories' || cat.toLowerCase() === 'all'
          );
          const finalCategories = hasAll
            ? fetchedCategories
            : ['All Categories', ...fetchedCategories];
          setCategories(finalCategories);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories(DEFAULT_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };

    void loadCategories();
  }, [getPredefinedCategories]);

  if (loading) {
    return (
      <Box
        sx={{
          borderBottom: `1px solid ${T.border}`,
          px: 2,
          py: 1.5,
        }}
      >
        <Box
          sx={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            color: T.text3,
            fontSize: 13,
          }}
        >
          Chargement des catégories...
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${T.border}`,
        bgcolor: T.bg1,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Tabs
        value={selectedTab}
        onChange={onTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 48,
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
            background: `linear-gradient(90deg, ${T.accent}, ${T.accentHover})`,
          },
          '& .MuiTabs-scrollButtons': {
            color: T.text2,
            '&.Mui-disabled': {
              opacity: 0.3,
            },
          },
        }}
      >
        {categories.map((category, index) => (
          <Tab
            key={index}
            label={category}
            sx={{
              minHeight: 48,
              px: 2.5,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              color: T.text3,
              transition: 'all 0.2s ease',
              '&:hover': {
                color: T.text2,
                bgcolor: T.bg2,
              },
              '&.Mui-selected': {
                color: T.accent,
                fontWeight: 700,
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
}

export default AmenityCategories;
