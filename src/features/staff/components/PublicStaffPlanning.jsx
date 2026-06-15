import React, { useState, useEffect } from 'react';
import { CircularProgress } from '@mui/material';
import { getStaffPlannig, updateStaffPlannig } from '../services/serverApi.task';
import ModifyStaffPlanningWrapper from './ModifyStaffPlanningWrapper';
import TeamCalendarView from './TeamCalendarView';
import { ToastContainer } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { getcities, getcountries } from '../../setting/services/serverApi.adminConfig';
import { getListingsTa, getTaskConfigs } from '../../tasks/services/serverApi.task';
import { getLanguage } from '../services/serverApi.task';
import StaffPlanningFilter from './StaffPlanningFilter';
import { can } from '../../../utils/permissions';
import { ENGLISH_DAYS, toEnglishDay, findScheduleByDay, normalizeScheduleToEnglish } from '../../../utils/dayNameUtils';
const daysOfWeek = ENGLISH_DAYS;
const PublicStaffPlanning = () => {
  const {
    t
  } = useTranslation('common');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [listings, setListings] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [canCreate, setCanCreate] = useState(can('create'));
  const [canUpdate, setCanUpdate] = useState(can('update'));
  useEffect(() => {
    fetchTaskTypes();
    fetchCities();
    fetchCountries();
    fetchListings();
    fetchLanguages();
  }, []);
  useEffect(() => {
    fetchStaff();
  }, [page, limit, searchText, selectedListings, selectedTypes, selectedLanguages]);
  useEffect(() => {
    setIsNextDisabled(page + 1 * limit >= totalCount);
  }, [page, limit, totalCount]);
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search_text: searchText
      };
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      if (selectedTypes && selectedTypes.length > 0) {
        params.types = selectedTypes;
      }
      if (selectedLanguages && selectedLanguages.length > 0) {
        params.languages = selectedLanguages;
      }
      const {
        data
      } = await getStaffPlannig(params);
      setStaff(data.data);
      const total = data.total || 0;
      setTotalCount(total);
      setIsNextDisabled(total === 0 || (page + 1) * limit >= total);
    } catch (err) {
      setStaff([]);
      setTotalCount(0);
      setIsNextDisabled(true);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdate = staffMember => {
    setSelectedStaff(staffMember);
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedStaff(null);
  };
  const updateAbsent = async (staffId, present, dayName) => {
    const findStaff = staff.find(x => x._id == staffId);
    if (!findStaff) {
      return;
    }
    const englishDayName = toEnglishDay(dayName);
    const daySchedule = findScheduleByDay(findStaff.staffPlanning?.schedule, dayName);
    if (daySchedule) {
      daySchedule.present = present;
      const normalizedSchedule = normalizeScheduleToEnglish(findStaff.staffPlanning?.schedule || []);
      updateStaffPlannig({
        staffId: findStaff._id,
        schedule: normalizedSchedule
      }).then(({
        data
      }) => {
        setStaff(prevStaff => prevStaff.map(s => s._id == staffId ? {
          ...s,
          staffPlanning: data.planning
        } : s));
      }).catch(err => {});
    } else {}
  };
  const handleStaffUpdate = (staffId, planning) => {
    setStaff(prevStaff => prevStaff.map(s => s._id == staffId ? {
      ...s,
      staffPlanning: planning
    } : s));
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguage();
      if (response.data) {
        setLanguages(response.data);
      }
    } catch (error) {}
  };
  const fetchCities = async () => {
    try {
      const response = await getcities();
      setCities(response.data.cities);
    } catch (error) {}
  };
  const fetchCountries = async () => {
    try {
      const response = await getcountries();
      setCountries(response.data);
    } catch (error) {}
  };
  const fetchListings = async () => {
    try {
      const response = await getListingsTa();
      setListings(response);
    } catch (error) {}
  };
  const fetchTaskTypes = async () => {
    try {
      const response = await getTaskConfigs();
      if (response && Array.isArray(response)) {
        const updatedTaskTypes = response.flatMap(item => {
          if (item.task === 'CONCIERGE' && Array.isArray(item?.subs)) {
            return item.subs.map(sub => ({
              ...sub,
              task: sub.type
            }));
          }
          return item;
        });
        setTaskTypes(updatedTaskTypes);
      }
    } catch (error) {}
  };
  const handleFilterChange = (key, value) => {
    setPage(0);
  };
  const handleSearch = () => {
    setPage(0);
    fetchStaff();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setSelectedTypes([]);
    setSelectedLanguages([]);
    setPage(0);
  };
  if (error) {
    return <div className="w-full h-64 flex justify-center items-center text-red-500">
        {error}
      </div>;
  }
  return <div className="card !px-2 !py-2">
      <ToastContainer position="top-right" autoClose={3000} />

      {loading ? <div className="w-full flex justify-center items-center h-screen">
          <CircularProgress sx={{
        color: '#E6B022'
      }} />
        </div> : <TeamCalendarView staff={staff} onUpdateStaff={handleStaffUpdate} onBulkUpdate={template => {
      // Apply template to all staff
      staff.forEach(member => {
        handleStaffUpdate(member._id, {
          schedule: template
        });
      });
    }} onSaveAll={async modifiedStaff => {
      // Save all staff planning changes to API
      const savePromises = modifiedStaff.filter(member => member.staffPlanning?.schedule).map(member => updateStaffPlannig({
        staffId: member._id,
        schedule: normalizeScheduleToEnglish(member.staffPlanning.schedule)
      }));
      await Promise.all(savePromises);
    }} />}

      <ModifyStaffPlanningWrapper open={openModal} handleClose={handleCloseModal} staff={selectedStaff} onStaffUpdate={handleStaffUpdate} />
    </div>;
};
export default PublicStaffPlanning;
