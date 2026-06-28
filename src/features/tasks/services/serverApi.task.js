export async function getTasksCountByStaff({
  startDate,
  endDate,
  staffIds
}) {
  if (!startDate || !endDate || !Array.isArray(staffIds) || staffIds.length === 0) {
    throw new Error('startDate, endDate, and staffIds are required');
  }
  const ids = staffIds.join(',');
  const url = `${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-tasks-count-by-staff?startDate=${startDate}&endDate=${endDate}&staffIds=${ids}`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
}
export async function getStaffStatusCounts() {
  const subTypes = ['CLEAN', 'CHECKIN', 'CHECKOUT', 'ASSIST', 'CONCIERGE'];
  const query = subTypes.join(',');
  const url = `${MICROSERVICE_BASE_URL.SRV_TASK}/staff/count-by-subtype?subTypes=${encodeURIComponent(query)}`;
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
}
import axios from 'axios';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';
export function getTasks(params = {}) {
  const {
    startDate,
    endDate,
    listingIds = [],
    staging = false,
    selectedTaskTypes = [],
    selectedFrenchTasks = [],
    selectedDarijaTasks = [],
    selectedStatuses = ['Pending', 'Confirmed']
  } = params;
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required parameters');
  }
  const queryParams = new URLSearchParams({
    startDate,
    endDate,
    listingIds: listingIds.join(','),
    staging
  });
  if (selectedTaskTypes.length > 0) {
    selectedTaskTypes.forEach(type => {
      queryParams.append('types', type);
    });
  }
  selectedFrenchTasks.forEach(taskId => {
    const taskName = taskId.replace('-fr', '');
    queryParams.append('taskNames', taskName);
  });
  selectedDarijaTasks.forEach(taskId => {
    const taskName = taskId.replace('-da', '');
    queryParams.append('taskNames', taskName);
  });
  if (selectedStatuses.length > 0) {
    selectedStatuses.forEach(status => {
      queryParams.append('status', status);
    });
  }
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-tasks?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getListings(staging = false, listingIds = [], cityIds = [], countryNames = [], useActiveFilter = true, active = ['true'], page = 0, limit = 0, paged = false) {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    paged: String(paged),
    staging: String(staging)
  });
  if (Array.isArray(active)) {
    if (active.length === 1) {
      params.append('useActiveFilter', 'true');
      params.append('active', active[0]);
    } else if (active.length === 0 || active.length === 2) {
      params.append('useActiveFilter', 'false');
    }
  }
  if (Array.isArray(listingIds) && listingIds.length > 0) {
    listingIds.forEach(id => {
      if (id) params.append('listingIds', id);
    });
  }
  if (Array.isArray(cityIds) && cityIds.length > 0) {
    cityIds.forEach(id => {
      if (id) params.append('cityIds', id);
    });
  }
  if (Array.isArray(countryNames) && countryNames.length > 0) {
    countryNames.forEach(country => {
      if (country) params.append('countryNames', country);
    });
  }
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/listings-by-city?${params.toString()}`);
}
export function getListingsTa(staging = false) {
  const q = new URLSearchParams({
    page: '0',
    limit: '500',
    staging: String(staging),
    compact: 'true',
  });
  return axios
    .get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings?${q.toString()}`)
    .then((response) => {
      const body = response.data;
      const rows = Array.isArray(body?.data) ? body.data : [];
      return rows.map((listing) => ({
        id: listing._id,
        _id: listing._id,
        name: listing.name,
        TS_CLEAN: listing.TS_CLEAN,
        services: listing?.services || [],
        ownerId: listing?.ownerId,
      }));
    })
    .catch((error) => {
      if (error?.response?.status === 404) return [];
      throw error;
    });
}

/** Listings avec ownerId + indicateurs sync RU / Channex (admin owners). */
export function getListingsWithChannelMetrics(staging = false) {
  const q = new URLSearchParams({
    page: '0',
    limit: '500',
    staging: String(staging),
    forListingsOverview: 'true',
  });
  return axios
    .get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings?${q.toString()}`)
    .then((response) => {
      const body = response.data;
      const rows = Array.isArray(body?.data) ? body.data : [];
      return rows.map((listing) => ({
        id: listing._id,
        _id: listing._id,
        name: listing.name,
        ownerId: listing?.ownerId,
        rentalUnitedIds: Array.isArray(listing?.rentalUnitedIds) ? listing.rentalUnitedIds : [],
        channexListingId: listing?.channexListingId || '',
      }));
    })
    .catch((error) => {
      if (error?.response?.status === 404) return [];
      throw error;
    });
}
export function getTasksByStaff(params = {}) {
  const {
    startDate,
    endDate,
    staffIds = [],
    staging = false,
    selectedTaskTypes = [],
    selectedListings = [],
    selectedCities = [],
    selectedCountries = [],
    selectedFrenchTasks = [],
    selectedDarijaTasks = [],
    nearDates,
    urgent,
    assigned
  } = params;
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required parameters');
  }
  let url = `${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-tasks-by-staff?`;
  url += `startDate=${startDate}&endDate=${endDate}`;
  url += `&staffIds=${staffIds.join(',')}`;
  url += `&staging=${staging}`;
  if (nearDates && nearDates !== 'all') {
    url += `&nearDates=${encodeURIComponent(nearDates)}`;
  }
  if (selectedTaskTypes.length > 0) {
    selectedTaskTypes.forEach(type => {
      url += `&types=${encodeURIComponent(type)}`;
    });
  }
  if (selectedListings.length > 0) {
    selectedListings.forEach(id => {
      url += `&listingIds=${encodeURIComponent(id)}`;
    });
  }
  if (selectedCities.length > 0) {
    selectedCities.forEach(id => {
      url += `&cityIds=${encodeURIComponent(id)}`;
    });
  }
  if (selectedCountries.length > 0) {
    selectedCountries.forEach(country => {
      url += `&countryNames=${encodeURIComponent(country)}`;
    });
  }
  selectedFrenchTasks.forEach(taskId => {
    const taskName = taskId.replace('-fr', '');
    url += `&taskNames=${encodeURIComponent(taskName)}`;
  });
  selectedDarijaTasks.forEach(taskId => {
    const taskName = taskId.replace('-da', '');
    url += `&taskNames=${encodeURIComponent(taskName)}`;
  });

  // Add urgent and assigned params if present
  if (urgent) {
    url += `&urgent=true`;
  }
  if (assigned) {
    url += `&assigned=true`;
  }
  return axios.get(url).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getStaff(params = {}) {
  const {
    subTypes,
    page = 0,
    limit = 25,
    paged = true
  } = params;
  let url = `${MICROSERVICE_BASE_URL.SRV_TASK}/staff/approved-staff?page=${page}&limit=${limit}&paged=${paged}&search_text=`;
  if (subTypes && Array.isArray(subTypes) && subTypes.length > 0) {
    url += `&subTypes=${subTypes.join(',')}`;
  }
  return axios.get(url);
}
export function getStaffOwner(owner_id) {
  let url = `${MICROSERVICE_BASE_URL.SRV_TASK}/staff/approved-staff?page=0&limit=100&paged=false`;
  if (owner_id) {
    url += `&owner_id=${owner_id}`;
  }
  return axios.get(url);
}
export async function AssignTaskToStaff(id, staffId) {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/assign-task/${id}`, {
      staffId
    });
    return response;
  } catch (error) {
    throw error;
  }
}
export function createTask(task) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/create-task`, task).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function updateTask(id, task) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/update-task/${id}`, task).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function getReservationByNumber(reservationNumber, staging = false) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/by-reservation-number/${reservationNumber}?staging=${staging}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data.reservation;
  }).catch(error => {
    throw error;
  });
}
export function getAllTasks(params = {}) {
  const defaultParams = {
    page: 0,
    limit: 20,
    paged: true,
    type: [],
    subType: [],
    status: [],
    assignmentStatus: [],
    listingId: null,
    reservationNumber: '',
    searchByGuest: '',
    cityIds: [],
    countryNames: [],
    useActiveFilter: true,
    active: ['true'],
    listingIds: []
  };
  const {
    page = 0,
    limit = 20,
    paged = true,
    type = defaultParams.type,
    subType = defaultParams.subType,
    status = [],
    assignmentStatus = [],
    reservationNumber = defaultParams.reservationNumber,
    listingId = null,
    searchByGuest = defaultParams.searchByGuest,
    staging = false,
    cityIds = [],
    countryNames = [],
    useActiveFilter = true,
    active = ['true'],
    listingIds = [],
    nearDates = [],
    emergency = [],
    creationStart = '',
    creationEnd = '',
    startDate = '',
    endDate = ''
  } = {
    ...defaultParams,
    ...params
  };
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  queryParams.append('paged', paged.toString());
  queryParams.append('type', type.join(','));
  queryParams.append('subType', subType.join(','));
  queryParams.append('status', status.join(','));
  queryParams.append('assignmentStatus', assignmentStatus.join(','));
  queryParams.append('reservationNumber', reservationNumber.trim());
  queryParams.append('searchByGuest', searchByGuest?.toString() || '');
  queryParams.append('staging', staging.toString());
  if (Array.isArray(active)) {
    if (active.length === 1) {
      queryParams.append('useActiveFilter', 'true');
      queryParams.append('active', active[0]);
    } else if (active.length === 0 || active.length === 2) {
      queryParams.append('useActiveFilter', 'false');
    }
  }
  if (cityIds.length > 0) {
    cityIds.forEach(cityId => queryParams.append('cityIds', cityId));
  }
  if (countryNames.length > 0) {
    countryNames.forEach(country => queryParams.append('countryNames', country));
  }
  if (listingIds.length > 0) {
    listingIds.forEach(id => queryParams.append('listingId', id));
  }
  if (nearDates.length > 0) {
    nearDates.forEach(nd => queryParams.append('nearDates', nd));
  }
  if (emergency.length > 0) {
    emergency.forEach(e => queryParams.append('emergency', e));
  }
  if (creationStart) {
    queryParams.append('creationStart', creationStart);
  }
  if (creationEnd) {
    queryParams.append('creationEnd', creationEnd);
  }
  if (startDate) {
    queryParams.append('startDate', startDate);
  }
  if (endDate) {
    queryParams.append('endDate', endDate);
  }
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-all-tasks?${queryParams.toString()}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}
export function searchListings(params = {}) {
  const {
    page = 0,
    limit = 10,
    name = '',
    city = '',
    country = '',
    sortingBy = '',
    staging = false
  } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    name,
    city,
    country,
    sortingBy,
    staging
  }).toString();
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/?${queryParams}`).then(response => {
    if (!response.data) {
      throw new Error('No data received from server');
    }
    return response.data;
  }).catch(error => {
    throw error;
  });
}

// __________________________TASK_CONFIG__________________________

export const getTaskConfigs = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/task-config/get`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const createTaskConfig = async data => {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_TASK}/task-config/create`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const updateTaskConfig = async (id, data) => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/task-config/update/${id}`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const deleteTaskConfig = async id => {
  try {
    const response = await axios.delete(`${MICROSERVICE_BASE_URL.SRV_TASK}/task-config/delete/${id}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const deleteTask = async taskId => {
  try {
    const response = await axios.delete(`${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ______________________________REMINDER____________________________

export const getReminders = async () => {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_TASK}/reminder`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
export const updateReminder = async data => {
  try {
    const response = await axios.put(`${MICROSERVICE_BASE_URL.SRV_TASK}/reminder/update`, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// _____________________________ListingList____________________________

export function getListingsList(staging = false) {
  return axios.get(`${MICROSERVICE_BASE_URL.LISTING}/?staging=${staging}`).then(response => {
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return response.data.data.map(listing => ({
      id: listing._id,
      _id: listing._id,
      name: listing.name,
      checkInTime: listing.checkInTimeStart,
      checkOutTime: listing.checkOutTime,
      propertyUnit: listing.propertyUnit,
      roomTypes: listing.roomTypes
    }));
  }).catch(error => {
    throw error;
  });
}
export function getCities() {
  return axios.get(`${MICROSERVICE_BASE_URL.CITY}?page=0&limit=10&search_text&paged=false`);
}
export function getCountries() {
  return axios.get(`${MICROSERVICE_BASE_URL.COUNTRY}?page=0&limit=10&search_text&paged=false`);
}
export function getConciergeType(page, limit, paged, search_text) {
  return axios.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/concierge-type/get?page=${page}&limit=${limit}&paged=${paged}&search_text=${search_text}`);
}
export function createConciergeType(data) {
  return axios.post(`${MICROSERVICE_BASE_URL.SRV_LISTING}/concierge-type/create`, data);
}
export function updateConciergeType(id, data) {
  return axios.put(`${MICROSERVICE_BASE_URL.SRV_LISTING}/concierge-type/update/${id}`, data);
}
export function deleteConciergeType(id) {
  return axios.delete(`${MICROSERVICE_BASE_URL.SRV_LISTING}/concierge-type/delete/${id}`);
}
export function getCalendarCounts({
  listingIds = [],
  startDate,
  endDate
}) {
  return axios.get(`${MICROSERVICE_BASE_URL.RESERVATION}/get-calendar-counts?` + listingIds.map(id => `listingIds[]=${id}`).join('&') + `&startDate=${startDate}&endDate=${endDate}`).then(res => res.data).catch(error => {
    throw error;
  });
}
export function getTasksUrgentUnassignedCounts({
  listingIds = [],
  startDate,
  endDate
}) {
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }
  const ids = (Array.isArray(listingIds) ? listingIds.filter(Boolean) : []).join(',');
  const url = `${MICROSERVICE_BASE_URL.SRV_TASK}/tasks/get-tasks-count?startDate=${startDate}&endDate=${endDate}` + (ids ? `&listingIds=${ids}` : '');
  return axios.get(url).then(res => res.data).catch(error => {
    throw error;
  });
}

// __________________________ Listing Clean/Inside __________________________

export function updateListingInsideClean(listingId, {
  inside,
  clean
}) {
  if (!listingId) throw new Error('listingId is required');
  const url = `${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/update-inside-clean/${listingId}`;
  return axios.put(url, {
    inside,
    clean
  }).then(response => response.data).catch(error => {
    throw error;
  });
}
