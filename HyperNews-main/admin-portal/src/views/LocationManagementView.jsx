// src/views/LocationManagementView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { 
  Globe, 
  MapPin, 
  Building2, 
  Map, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Database,
  ArrowUpRight,
  Sliders,
  Check,
  Clock,
  Download,
  Shield,
  Activity,
  Zap,
  FolderTree,
  FileText,
  SlidersHorizontal,
  Calendar,
  CalendarDays,
  ExternalLink,
  Eye,
  Tag,
  AlertCircle,
  Sparkles,
  Radio,
  Bookmark
} from 'lucide-react';

// Fallback Initial Data in case server is starting up
const SEEDED_LANGUAGES = [
  { id: 1, code: 'en', name: 'English', is_active: true, display_order: 1 },
  { id: 2, code: 'te', name: 'Telugu', is_active: true, display_order: 2 },
  { id: 3, code: 'hi', name: 'Hindi', is_active: true, display_order: 3 },
  { id: 4, code: 'ta', name: 'Tamil', is_active: true, display_order: 4 },
  { id: 5, code: 'kn', name: 'Kannada', is_active: true, display_order: 5 },
  { id: 6, code: 'ml', name: 'Malayalam', is_active: true, display_order: 6 }
];

const SEEDED_STATES = [
  { id: 1, name: 'Telangana', language_id: 2, language_name: 'Telugu', is_active: true, districts_count: 5 },
  { id: 2, name: 'Andhra Pradesh', language_id: 2, language_name: 'Telugu', is_active: true, districts_count: 4 },
  { id: 3, name: 'Karnataka', language_id: 5, language_name: 'Kannada', is_active: true, districts_count: 2 },
  { id: 4, name: 'Maharashtra', language_id: 3, language_name: 'Hindi', is_active: true, districts_count: 2 },
  { id: 5, name: 'Tamil Nadu', language_id: 4, language_name: 'Tamil', is_active: true, districts_count: 1 }
];

const SEEDED_DISTRICTS = [
  { id: 1, name: 'Hyderabad', state_id: 1, state_name: 'Telangana', cities_count: 6 },
  { id: 2, name: 'Ranga Reddy', state_id: 1, state_name: 'Telangana', cities_count: 2 },
  { id: 3, name: 'Medchal-Malkajgiri', state_id: 1, state_name: 'Telangana', cities_count: 1 },
  { id: 4, name: 'Warangal', state_id: 1, state_name: 'Telangana', cities_count: 1 },
  { id: 5, name: 'Visakhapatnam', state_id: 2, state_name: 'Andhra Pradesh', cities_count: 2 },
  { id: 6, name: 'NTR (Vijayawada)', state_id: 2, state_name: 'Andhra Pradesh', cities_count: 1 },
  { id: 7, name: 'Bengaluru Urban', state_id: 3, state_name: 'Karnataka', cities_count: 3 },
  { id: 8, name: 'Mumbai City', state_id: 4, state_name: 'Maharashtra', cities_count: 2 },
  { id: 9, name: 'Chennai', state_id: 5, state_name: 'Tamil Nadu', cities_count: 1 }
];

const SEEDED_CITIES = [
  { id: 1, name: 'Hitec City', district_id: 1, district_name: 'Hyderabad', state_name: 'Telangana' },
  { id: 2, name: 'Gachibowli', district_id: 1, district_name: 'Hyderabad', state_name: 'Telangana' },
  { id: 3, name: 'Banjara Hills', district_id: 1, district_name: 'Hyderabad', state_name: 'Telangana' },
  { id: 4, name: 'Jubilee Hills', district_id: 1, district_name: 'Hyderabad', state_name: 'Telangana' },
  { id: 5, name: 'Secunderabad', district_id: 1, district_name: 'Hyderabad', state_name: 'Telangana' },
  { id: 6, name: 'Madhapur', district_id: 1, district_name: 'Hyderabad', state_name: 'Telangana' },
  { id: 7, name: 'Kondapur', district_id: 2, district_name: 'Ranga Reddy', state_name: 'Telangana' },
  { id: 8, name: 'Shamshabad', district_id: 2, district_name: 'Ranga Reddy', state_name: 'Telangana' },
  { id: 9, name: 'MVP Colony', district_id: 5, district_name: 'Visakhapatnam', state_name: 'Andhra Pradesh' },
  { id: 10, name: 'Indiranagar', district_id: 7, district_name: 'Bengaluru Urban', state_name: 'Karnataka' },
  { id: 11, name: 'Koramangala', district_id: 7, district_name: 'Bengaluru Urban', state_name: 'Karnataka' },
  { id: 12, name: 'Bandra West', district_id: 8, district_name: 'Mumbai City', state_name: 'Maharashtra' }
];

const SEEDED_CATEGORIES = [
  { id: 1, name: 'Politics', image_url: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=150', display_order: 1, is_active: true, color: '#1E88E5', description: 'Local political news, policy debates, leaders, and government updates', news_count: 18 },
  { id: 2, name: 'Crime & Safety', image_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=150', display_order: 2, is_active: true, color: '#D32F2F', description: 'Police cases, legal investigations, civic enforcement, and public safety alerts', news_count: 24 },
  { id: 3, name: 'Education', image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150', display_order: 3, is_active: true, color: '#43A047', description: 'Schools, universities, board exams, scholarships, and educational notices', news_count: 43 },
  { id: 4, name: 'Health & Wellness', image_url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=150', display_order: 4, is_active: true, color: '#00897B', description: 'Hospitals, public healthcare alerts, epidemics, and medical innovations', news_count: 45 },
  { id: 5, name: 'Business & Economy', image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150', display_order: 5, is_active: true, color: '#3949AB', description: 'Local commerce, startups, MSMEs, inflation, and market indices', news_count: 22 },
  { id: 6, name: 'Sports & Fitness', image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150', display_order: 6, is_active: true, color: '#7CB342', description: 'Regional cricket, tournament scores, athletics, and stadium events', news_count: 44 },
  { id: 7, name: 'Entertainment & Culture', image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150', display_order: 7, is_active: true, color: '#EC407A', description: 'Tollywood/Bollywood film releases, celebrity interviews, and cultural festivals', news_count: 38 },
  { id: 8, name: 'Agriculture & Rural', image_url: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=150', display_order: 8, is_active: true, color: '#F59E0B', description: 'Farming techniques, mandi crop rates, rainfall data, and farmer schemes', news_count: 12 }
];

const SEEDED_EVENTS = [
  {
    id: 1,
    event_uid: 'EVT-HYD-2026-001',
    title: 'Hyderabad AI & Civic Technology Summit 2026',
    description: 'Premier regional convention bringing together engineers, municipal officers, and civic startups to discuss AI-driven traffic systems and water grid IoT sensors.',
    event_date: '2026-10-15',
    start_time: '09:30 AM',
    end_time: '05:30 PM',
    location: 'HITEX Exhibition Center, Hitec City, Hyderabad',
    is_online: false,
    event_url: '',
    image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
    state_id: 1,
    state_name: 'Telangana',
    district_id: 1,
    district_name: 'Hyderabad',
    city_id: 1,
    city_name: 'Hitec City',
    language_id: 1,
    language_name: 'English',
    is_approved: true,
    approved_by: 'usr_lead_admin',
    created_by: 'usr_admin_roshith',
    created_at: '2026-09-18T10:00:00Z'
  },
  {
    id: 2,
    event_uid: 'EVT-VIZ-2026-002',
    title: 'Visakhapatnam Blue Economy & Coastal Green Forum',
    description: 'Stakeholder roundtable discussing offshore renewable energy, port modernization, and marine plastic abatement initiatives across the Andhra shoreline.',
    event_date: '2026-10-22',
    start_time: '10:00 AM',
    end_time: '02:00 PM',
    location: 'Novotel Varun Beach Convention Hall, Visakhapatnam',
    is_online: false,
    event_url: '',
    image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600',
    state_id: 2,
    state_name: 'Andhra Pradesh',
    district_id: 5,
    district_name: 'Visakhapatnam',
    city_id: 9,
    city_name: 'MVP Colony',
    language_id: 2,
    language_name: 'Telugu',
    is_approved: true,
    approved_by: 'usr_lead_admin',
    created_by: 'usr_moderator_anil',
    created_at: '2026-09-19T14:30:00Z'
  },
  {
    id: 3,
    event_uid: 'EVT-BLR-2026-003',
    title: 'Regional Fact-Checking & Vernacular Reporting Workshop',
    description: 'Hands-on virtual training masterclass for student reporters and citizen journalists on detecting deepfakes, verifying viral WhatsApp claims, and geolocation.',
    event_date: '2026-09-30',
    start_time: '03:00 PM',
    end_time: '06:00 PM',
    location: 'Webinar / YouTube Live Stream',
    is_online: true,
    event_url: 'https://stream.hypernews.org/workshop-0926',
    image_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600',
    state_id: 3,
    state_name: 'Karnataka',
    district_id: 7,
    district_name: 'Bengaluru Urban',
    city_id: 10,
    city_name: 'Indiranagar',
    language_id: 1,
    language_name: 'English',
    is_approved: false, // Pending Approval Queue!
    approved_by: null,
    created_by: 'usr_citizen_kavya',
    created_at: '2026-09-20T08:15:00Z'
  }
];

export default function LocationManagementView({ initialTab = 'languages' }) {
  const { role } = useAuth();
  const { showToast } = useToast();

  // Active Deck: 'languages' | 'states' | 'districts' | 'cities' | 'categories' | 'events' | 'hierarchy'
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Datasets
  const [languages, setLanguages] = useState(SEEDED_LANGUAGES);
  const [states, setStates] = useState(SEEDED_STATES);
  const [districts, setDistricts] = useState(SEEDED_DISTRICTS);
  const [cities, setCities] = useState(SEEDED_CITIES);
  const [categories, setCategories] = useState(SEEDED_CATEGORIES);
  const [events, setEvents] = useState(SEEDED_EVENTS);
  const [eventsFilter, setEventsFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'online'
  const [selectedEventState, setSelectedEventState] = useState('all');
  const [stats, setStats] = useState({
    total_languages: 12,
    total_states: 12,
    total_districts: 58,
    total_cities: 12,
    total_categories: 8,
    total_events: 3
  });

  // Hierarchy Tree State
  const [expandedStates, setExpandedStates] = useState({});
  const [expandedDistricts, setExpandedDistricts] = useState({});
  const [stateHierarchies, setStateHierarchies] = useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('all');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState('all');

  // Modals state
  const [modalType, setModalType] = useState(null); // 'language' | 'state' | 'district' | 'city'
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [langForm, setLangForm] = useState({ code: '', name: '', display_order: 1, is_active: true });
  const [stateForm, setStateForm] = useState({ name: '', language_id: 1, is_active: true });
  const [distForm, setDistForm] = useState({ name: '', state_id: 1 });
  const [cityForm, setCityForm] = useState({ name: '', district_id: 1 });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#1E88E5',
    image_url: '',
    description: '',
    display_order: 1,
    is_active: true
  });
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    image_url: '',
    event_date: '',
    start_time: '09:30 AM',
    end_time: '05:30 PM',
    location: '',
    is_online: false,
    event_url: '',
    state_id: 1,
    district_id: 1,
    city_id: 1,
    language_id: 1
  });
  const [eventDetailItem, setEventDetailItem] = useState(null);
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    eventId: null,
    eventTitle: '',
    reason: ''
  });

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut '/' or 'Cmd+K' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setModalType(null);
        setEditingItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all location data from API
  const fetchAllData = async (showNotice = false) => {
    setIsLoading(true);
    try {
      // 0. Location Stats
      try {
        const statsRes = await api.getLocationStats();
        if (statsRes && typeof statsRes === 'object') {
          setStats(prev => ({ ...prev, ...statsRes }));
        }
      } catch (e) {
        console.info('Using stats fallback:', e.message);
      }

      // 1. Languages
      try {
        const langRes = await api.getLanguages(null, 100);
        if (Array.isArray(langRes) && langRes.length > 0) {
          setLanguages(langRes);
        }
      } catch (e) {
        console.info('Using fallback languages:', e.message);
      }

      // 2. States
      try {
        const statesRes = await api.getStates(null, 100);
        if (Array.isArray(statesRes) && statesRes.length > 0) {
          setStates(statesRes);
        }
      } catch (e) {
        console.info('Using fallback states:', e.message);
      }

      // 3. Districts
      try {
        const distRes = await api.getDistricts(null, 200);
        if (Array.isArray(distRes) && distRes.length > 0) {
          setDistricts(distRes);
        }
      } catch (e) {
        console.info('Using fallback districts:', e.message);
      }

      // 4. Cities
      try {
        const cityRes = await api.getCities(null, 200);
        if (Array.isArray(cityRes) && cityRes.length > 0) {
          setCities(cityRes);
        }
      } catch (e) {
        console.info('Using fallback cities:', e.message);
      }

      // 5. Categories from API
      try {
        const catRes = await api.getAllCategories(true);
        if (Array.isArray(catRes) && catRes.length > 0) {
          setCategories(catRes);
          setStats(prev => ({ ...prev, total_categories: catRes.length }));
        }
      } catch (e) {
        console.info('Using fallback categories:', e.message);
      }

      // 6. Events from API
      try {
        const eventsRes = await api.getEvents({ upcoming_only: false });
        let loadedEvents = [];
        if (eventsRes && Array.isArray(eventsRes.items) && eventsRes.items.length > 0) {
          loadedEvents = eventsRes.items;
        }
        // Also fetch pending events
        try {
          const pendingRes = await api.getPendingEvents(50, 0);
          if (pendingRes && Array.isArray(pendingRes.items) && pendingRes.items.length > 0) {
            const existingIds = new Set(loadedEvents.map(e => e.id));
            pendingRes.items.forEach(pe => {
              if (!existingIds.has(pe.id)) {
                loadedEvents.push({ ...pe, is_approved: false });
              }
            });
          }
        } catch {}

        if (loadedEvents.length > 0) {
          setEvents(loadedEvents);
          setStats(prev => ({ ...prev, total_events: loadedEvents.length }));
        }
      } catch (e) {
        console.info('Using fallback events:', e.message);
      }

      if (showNotice) {
        showToast('Geographic registry synchronized with live database', 'success');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch State Hierarchy dynamically when expanded
  const toggleStateHierarchy = async (stateId) => {
    const nextState = !expandedStates[stateId];
    setExpandedStates(prev => ({ ...prev, [stateId]: nextState }));

    if (nextState && !stateHierarchies[stateId]) {
      try {
        const res = await api.getStateHierarchy(stateId);
        if (res && res.districts) {
          setStateHierarchies(prev => ({ ...prev, [stateId]: res }));
        }
      } catch {
        // Fallback: build from local districts and cities
        const localDists = districts.filter(d => d.state_id === stateId);
        setStateHierarchies(prev => ({
          ...prev,
          [stateId]: {
            id: stateId,
            name: states.find(s => s.id === stateId)?.name || 'State',
            districts: localDists.map(d => ({
              id: d.id,
              name: d.name,
              cities: cities.filter(c => c.district_id === d.id)
            }))
          }
        }));
      }
    }
  };

  const toggleDistrictHierarchy = (distId) => {
    setExpandedDistricts(prev => ({ ...prev, [distId]: !prev[distId] }));
  };

  // Filtered Lists
  const filteredLanguages = useMemo(() => {
    return languages.filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [languages, searchQuery]);

  const filteredStates = useMemo(() => {
    return states.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [states, searchQuery]);

  const filteredDistricts = useMemo(() => {
    return districts.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesState = selectedStateFilter === 'all' || d.state_id === Number(selectedStateFilter);
      return matchesSearch && matchesState;
    });
  }, [districts, searchQuery, selectedStateFilter]);

  const filteredCities = useMemo(() => {
    return cities.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDistrict = selectedDistrictFilter === 'all' || c.district_id === Number(selectedDistrictFilter);
      return matchesSearch && matchesDistrict;
    });
  }, [cities, searchQuery, selectedDistrictFilter]);

  // Language CRUD Handlers
  const handleOpenLanguageModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setLangForm({
        code: item.code,
        name: item.name,
        display_order: item.display_order || 1,
        is_active: item.is_active ?? true
      });
    } else {
      setEditingItem(null);
      setLangForm({ code: '', name: '', display_order: languages.length + 1, is_active: true });
    }
    setModalType('language');
  };

  const handleSaveLanguage = async (e) => {
    e.preventDefault();
    if (!langForm.name.trim() || !langForm.code.trim()) return;

    if (editingItem) {
      setLanguages(prev => prev.map(l => l.id === editingItem.id ? { ...l, ...langForm } : l));
      showToast(`Language "${langForm.name}" updated successfully!`, 'success');
      try {
        await api.updateLanguage(editingItem.id, langForm);
      } catch (err) {
        console.warn('Language updated locally:', err.message);
      }
    } else {
      const newLang = { id: Date.now(), ...langForm };
      setLanguages([...languages, newLang]);
      setStats(prev => ({ ...prev, total_languages: prev.total_languages + 1 }));
      showToast(`Language "${langForm.name}" registered successfully!`, 'success');
      try {
        await api.createLanguage(langForm);
      } catch (err) {
        console.warn('Language created locally:', err.message);
      }
    }
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteLanguage = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete language "${name}"?`)) {
      setLanguages(prev => prev.filter(l => l.id !== id));
      setStats(prev => ({ ...prev, total_languages: Math.max(prev.total_languages - 1, 0) }));
      showToast(`Language "${name}" removed.`, 'warning');
      try {
        await api.deleteLanguage(id);
      } catch (err) {
        console.warn('Deleted locally:', err.message);
      }
    }
  };

  // State CRUD Handlers
  const handleOpenStateModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setStateForm({
        name: item.name,
        language_id: item.language_id || (languages[0]?.id || 1),
        is_active: item.is_active ?? true
      });
    } else {
      setEditingItem(null);
      setStateForm({ name: '', language_id: languages[0]?.id || 1, is_active: true });
    }
    setModalType('state');
  };

  const handleSaveState = async (e) => {
    e.preventDefault();
    if (!stateForm.name.trim()) return;

    const lang = languages.find(l => l.id === Number(stateForm.language_id));

    if (editingItem) {
      setStates(prev => prev.map(s => s.id === editingItem.id ? { 
        ...s, 
        name: stateForm.name, 
        language_id: stateForm.language_id,
        language_name: lang ? lang.name : 'English',
        is_active: stateForm.is_active 
      } : s));
      showToast(`State "${stateForm.name}" updated!`, 'success');
      try {
        await api.updateState(editingItem.id, stateForm);
      } catch (err) {
        console.warn('State updated locally:', err.message);
      }
    } else {
      const newState = {
        id: Date.now(),
        name: stateForm.name,
        language_id: stateForm.language_id,
        language_name: lang ? lang.name : 'English',
        is_active: stateForm.is_active,
        districts_count: 0
      };
      setStates([...states, newState]);
      setStats(prev => ({ ...prev, total_states: prev.total_states + 1 }));
      showToast(`State "${stateForm.name}" added to territory registry!`, 'success');
      try {
        await api.createState(stateForm);
      } catch (err) {
        console.warn('State created locally:', err.message);
      }
    }
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteState = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete state "${name}" and its associated regions?`)) {
      setStates(prev => prev.filter(s => s.id !== id));
      setStats(prev => ({ ...prev, total_states: Math.max(prev.total_states - 1, 0) }));
      showToast(`State "${name}" deleted.`, 'warning');
      try {
        await api.deleteState(id);
      } catch (err) {
        console.warn('Deleted locally:', err.message);
      }
    }
  };

  // District CRUD Handlers
  const handleOpenDistrictModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setDistForm({
        name: item.name,
        state_id: item.state_id || (states[0]?.id || 1)
      });
    } else {
      setEditingItem(null);
      setDistForm({ name: '', state_id: states[0]?.id || 1 });
    }
    setModalType('district');
  };

  const handleSaveDistrict = async (e) => {
    e.preventDefault();
    if (!distForm.name.trim()) return;

    const state = states.find(s => s.id === Number(distForm.state_id));

    if (editingItem) {
      setDistricts(prev => prev.map(d => d.id === editingItem.id ? {
        ...d,
        name: distForm.name,
        state_id: distForm.state_id,
        state_name: state ? state.name : 'Unknown'
      } : d));
      showToast(`District "${distForm.name}" updated!`, 'success');
      try {
        await api.updateDistrict(editingItem.id, distForm);
      } catch (err) {
        console.warn('District updated locally:', err.message);
      }
    } else {
      const newDist = {
        id: Date.now(),
        name: distForm.name,
        state_id: distForm.state_id,
        state_name: state ? state.name : 'Unknown',
        cities_count: 0
      };
      setDistricts([...districts, newDist]);
      setStats(prev => ({ ...prev, total_districts: prev.total_districts + 1 }));
      showToast(`District "${distForm.name}" mapped successfully!`, 'success');
      try {
        await api.createDistrict(distForm);
      } catch (err) {
        console.warn('District created locally:', err.message);
      }
    }
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteDistrict = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete district "${name}"?`)) {
      setDistricts(prev => prev.filter(d => d.id !== id));
      setStats(prev => ({ ...prev, total_districts: Math.max(prev.total_districts - 1, 0) }));
      showToast(`District "${name}" removed.`, 'warning');
      try {
        await api.deleteDistrict(id);
      } catch (err) {
        console.warn('District deleted locally:', err.message);
      }
    }
  };

  // City CRUD Handlers
  const handleOpenCityModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setCityForm({
        name: item.name,
        district_id: item.district_id || (districts[0]?.id || 1)
      });
    } else {
      setEditingItem(null);
      setCityForm({ name: '', district_id: districts[0]?.id || 1 });
    }
    setModalType('city');
  };

  const handleSaveCity = async (e) => {
    e.preventDefault();
    if (!cityForm.name.trim()) return;

    const district = districts.find(d => d.id === Number(cityForm.district_id));
    const state = district ? states.find(s => s.id === district.state_id) : null;

    if (editingItem) {
      setCities(prev => prev.map(c => c.id === editingItem.id ? {
        ...c,
        name: cityForm.name,
        district_id: cityForm.district_id,
        district_name: district ? district.name : 'Unknown',
        state_name: state ? state.name : 'Unknown'
      } : c));
      showToast(`City / Ward "${cityForm.name}" updated!`, 'success');
      try {
        await api.updateCity(editingItem.id, cityForm);
      } catch (err) {
        console.warn('City updated locally:', err.message);
      }
    } else {
      const newCity = {
        id: Date.now(),
        name: cityForm.name,
        district_id: cityForm.district_id,
        district_name: district ? district.name : 'Unknown',
        state_name: state ? state.name : 'Unknown'
      };
      setCities([...cities, newCity]);
      setStats(prev => ({ ...prev, total_cities: prev.total_cities + 1 }));
      showToast(`City "${cityForm.name}" pinned to hyperlocal grid!`, 'success');
      try {
        await api.createCity(cityForm);
      } catch (err) {
        console.warn('City created locally:', err.message);
      }
    }
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteCity = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      setCities(prev => prev.filter(c => c.id !== id));
      setStats(prev => ({ ...prev, total_cities: Math.max(prev.total_cities - 1, 0) }));
      showToast(`City "${name}" removed.`, 'warning');
      try {
        await api.deleteCity(id);
      } catch (err) {
        console.warn('City deleted locally:', err.message);
      }
    }
  };

  // Category CRUD Handlers
  const handleOpenCategoryModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setCategoryForm({
        name: item.name || '',
        color: item.color || '#1E88E5',
        image_url: item.image_url || '',
        description: item.description || '',
        display_order: item.display_order || 1,
        is_active: item.is_active ?? true
      });
    } else {
      setEditingItem(null);
      setCategoryForm({
        name: '',
        color: '#1E88E5',
        image_url: '',
        description: '',
        display_order: categories.length + 1,
        is_active: true
      });
    }
    setModalType('category');
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    if (editingItem) {
      setCategories(prev => prev.map(c => c.id === editingItem.id ? { ...c, ...categoryForm } : c));
      showToast(`Category "${categoryForm.name}" updated!`, 'success');
      try {
        await api.updateCategory(editingItem.id, categoryForm);
      } catch (err) {
        console.warn('Category updated locally:', err.message);
      }
    } else {
      const newCat = {
        id: Date.now(),
        ...categoryForm,
        news_count: 0,
        created_at: new Date().toISOString()
      };
      setCategories(prev => [...prev, newCat]);
      setStats(prev => ({ ...prev, total_categories: (prev.total_categories || 0) + 1 }));
      showToast(`Category "${categoryForm.name}" registered successfully!`, 'success');
      try {
        await api.createCategory(categoryForm);
      } catch (err) {
        console.warn('Category created locally:', err.message);
      }
    }
    setModalType(null);
    setEditingItem(null);
  };

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"? Existing articles may need re-categorization.`)) {
      setCategories(prev => prev.filter(c => c.id !== id));
      setStats(prev => ({ ...prev, total_categories: Math.max((prev.total_categories || 1) - 1, 0) }));
      showToast(`Category "${name}" removed.`, 'warning');
      try {
        await api.deleteCategory(id);
      } catch (err) {
        console.warn('Deleted locally:', err.message);
      }
    }
  };

  const handleToggleCategoryActive = async (cat) => {
    const nextStatus = !cat.is_active;
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: nextStatus } : c));
    showToast(`Category "${cat.name}" is now ${nextStatus ? 'Active' : 'Inactive'}.`, 'info');
    try {
      await api.updateCategory(cat.id, { ...cat, is_active: nextStatus });
    } catch (err) {
      console.warn('Status toggled locally:', err.message);
    }
  };

  // Event CRUD & Approval Handlers
  const handleOpenEventModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setEventForm({
        title: item.title || '',
        description: item.description || '',
        image_url: item.image_url || '',
        event_date: item.event_date ? item.event_date.slice(0, 10) : '',
        start_time: item.start_time || '09:30 AM',
        end_time: item.end_time || '05:30 PM',
        location: item.location || '',
        is_online: item.is_online ?? false,
        event_url: item.event_url || '',
        state_id: item.state_id || (states[0]?.id || 1),
        district_id: item.district_id || (districts[0]?.id || 1),
        city_id: item.city_id || (cities[0]?.id || 1),
        language_id: item.language_id || (languages[0]?.id || 1)
      });
    } else {
      setEditingItem(null);
      const today = new Date().toISOString().slice(0, 10);
      setEventForm({
        title: '',
        description: '',
        image_url: '',
        event_date: today,
        start_time: '09:30 AM',
        end_time: '05:30 PM',
        location: '',
        is_online: false,
        event_url: '',
        state_id: states[0]?.id || 1,
        district_id: districts[0]?.id || 1,
        city_id: cities[0]?.id || 1,
        language_id: languages[0]?.id || 1
      });
    }
    setModalType('event');
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) return;

    const stateObj = states.find(s => s.id === Number(eventForm.state_id));
    const distObj = districts.find(d => d.id === Number(eventForm.district_id));
    const cityObj = cities.find(c => c.id === Number(eventForm.city_id));
    const langObj = languages.find(l => l.id === Number(eventForm.language_id));

    if (editingItem) {
      setEvents(prev => prev.map(ev => ev.id === editingItem.id ? {
        ...ev,
        ...eventForm,
        state_name: stateObj?.name || ev.state_name,
        district_name: distObj?.name || ev.district_name,
        city_name: cityObj?.name || ev.city_name,
        language_name: langObj?.name || ev.language_name
      } : ev));
      showToast(`Event "${eventForm.title}" updated!`, 'success');
      try {
        await api.updateEvent(editingItem.id, eventForm);
      } catch (err) {
        console.warn('Event updated locally:', err.message);
      }
    } else {
      const newEv = {
        id: Date.now(),
        event_uid: `EVT-${Date.now().toString(36).toUpperCase()}`,
        ...eventForm,
        state_name: stateObj?.name || 'Telangana',
        district_name: distObj?.name || 'Hyderabad',
        city_name: cityObj?.name || 'Hitec City',
        language_name: langObj?.name || 'English',
        is_approved: true,
        approved_by: 'usr_admin',
        created_by: 'usr_lead_admin',
        created_at: new Date().toISOString()
      };
      setEvents(prev => [newEv, ...prev]);
      setStats(prev => ({ ...prev, total_events: (prev.total_events || 0) + 1 }));
      showToast(`Event "${eventForm.title}" registered and published live!`, 'success');
      try {
        await api.createEvent(eventForm);
      } catch (err) {
        console.warn('Event created locally:', err.message);
      }
    }
    setModalType(null);
    setEditingItem(null);
  };

  const handleApproveEvent = async (id, statusApproved, rejectionReason = '') => {
    setEvents(prev => prev.map(ev => ev.id === id ? {
      ...ev,
      is_approved: statusApproved,
      rejection_reason: statusApproved ? null : rejectionReason,
      approved_by: statusApproved ? 'usr_lead_admin' : null
    } : ev));
    showToast(`Event ${statusApproved ? 'approved and published live' : 'rejected'}.`, statusApproved ? 'success' : 'warning');
    try {
      await api.approveEvent(id, statusApproved, rejectionReason);
    } catch (err) {
      console.warn('Approval updated locally:', err.message);
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (window.confirm(`Are you sure you want to remove event "${title}"?`)) {
      setEvents(prev => prev.filter(ev => ev.id !== id));
      setStats(prev => ({ ...prev, total_events: Math.max((prev.total_events || 1) - 1, 0) }));
      showToast(`Event "${title}" removed from schedule.`, 'warning');
      try {
        await api.deleteEvent(id);
      } catch (err) {
        console.warn('Event deleted locally:', err.message);
      }
    }
  };

  const handleOpenEventDetail = (event) => {
    setEventDetailItem(event);
    setModalType('event_detail');
  };

  // Export Geodata JSON
  const handleExportGeodata = () => {
    const payload = {
      export_timestamp: new Date().toISOString(),
      stats,
      languages,
      states,
      districts,
      cities
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `HyperNews_Geodata_Registry_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported full geodata registry with ${cities.length} cities`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* ==================================================================== */}
      {/* 1. OPERATIONS COMMAND DESK HEADER & LIVE GEOGRAPHIC BEACON */}
      {/* ==================================================================== */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left Title & Status Beacon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '3.25rem',
            height: '3.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald)',
            boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)'
          }}>
            <MapPin size={28} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.025em',
                margin: 0
              }}>
                Language & Location Operations
              </h1>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.625rem',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--accent-emerald)',
                  boxShadow: '0 0 8px var(--accent-emerald)'
                }} />
                HYPERLOCAL GEOGRAPHIC ROUTING ACTIVE
              </div>
            </div>

            <p style={{
              margin: '0.25rem 0 0 0',
              fontSize: '0.8125rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span>Regional Scripts • Administrative State & District Hierarchy • Hyperlocal City Wards</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                <Clock size={13} style={{ color: 'var(--primary)' }} />
                {currentTime.toLocaleTimeString('en-US', { hour12: false })} IST • FastAPI /base Live
              </span>
            </p>
          </div>
        </div>

        {/* Right Action Center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchAllData(true)}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Synchronize registry with FastAPI backend"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Geodata'}</span>
          </button>

          <button
            onClick={handleExportGeodata}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            title="Export complete location & language directory as JSON"
          >
            <Download size={14} />
            <span>Export Geodata</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'languages') handleOpenLanguageModal();
              else if (activeTab === 'states') handleOpenStateModal();
              else if (activeTab === 'districts') handleOpenDistrictModal();
              else if (activeTab === 'cities') handleOpenCityModal();
              else if (activeTab === 'categories') handleOpenCategoryModal();
              else if (activeTab === 'events') handleOpenEventModal();
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
          >
            <Plus size={15} />
            <span>
              {activeTab === 'languages' ? 'Add Language' :
               activeTab === 'states' ? 'Add State' :
               activeTab === 'districts' ? 'Add District' :
               activeTab === 'cities' ? 'Add City / Ward' :
               activeTab === 'categories' ? 'Create Category' :
               activeTab === 'events' ? 'Host / Create Event' : 'New Entity'}
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FIVE STRATEGIC TELEMETRY KPI CARDS (FROM /base/stats) */}
      {/* ==================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem'
      }}>
        {/* Card 1: Languages */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Active Languages
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.total_languages || languages.length}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}>
              <Globe size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--primary)', fontWeight: 600 }}>
            Telugu, English, Hindi, Tamil, Kannada +
          </div>
        </div>

        {/* Card 2: States */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                States & UTs
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.total_states || states.length}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-emerald)'
            }}>
              <Map size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
            100% Administrative Coverage
          </div>
        </div>

        {/* Card 3: Districts */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Mapped Districts
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.total_districts || districts.length}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
            Regional news routing active
          </div>
        </div>

        {/* Card 4: Hyperlocal Cities & Wards */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Hyperlocal Cities
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.total_cities || cities.length}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-amber)'
            }}>
              <MapPin size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
            Ward & Micro-zone targeting
          </div>
        </div>

        {/* Card 5: Categories */}
        <div 
          onClick={() => setActiveTab('categories')}
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: activeTab === 'categories' ? '2px solid #c084fc' : '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: activeTab === 'categories' ? '0 0 16px rgba(168, 85, 247, 0.3)' : 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to switch to Content Categories deck"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Publishing Desks
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.total_categories || categories.length}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc'
            }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: '#c084fc', fontWeight: 600 }}>
            {categories.length} Taxonomies • Click to View
          </div>
        </div>

        {/* Card 6: Hyperlocal Events */}
        <div 
          onClick={() => setActiveTab('events')}
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: activeTab === 'events' ? '2px solid #fb7185' : '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: activeTab === 'events' ? '0 0 16px rgba(244, 63, 94, 0.3)' : 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to switch to Hyperlocal Events deck"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Hyperlocal Events
              </span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {stats.total_events || events.length}
              </div>
            </div>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fb7185'
            }}>
              <CalendarDays size={18} />
            </div>
          </div>
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.6875rem', color: '#fb7185', fontWeight: 600 }}>
            {events.length} Events Scheduled • Click to View
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. MULTI-MODE DECK SWITCHER & NAVIGATION */}
      {/* ==================================================================== */}
      <div style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Mode Segmented Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          {[
            { id: 'languages', label: 'Languages & Scripts', icon: Globe, count: languages.length },
            { id: 'states', label: 'States & Territories', icon: Map, count: states.length },
            { id: 'districts', label: 'Administrative Districts', icon: Building2, count: districts.length },
            { id: 'cities', label: 'Hyperlocal Cities', icon: MapPin, count: cities.length },
            { id: 'categories', label: 'Content Categories', icon: Layers, count: categories.length },
            { id: 'events', label: 'Hyperlocal Events', icon: CalendarDays, count: events.length },
            { id: 'hierarchy', label: 'Geographic Hierarchy Tree', icon: FolderTree }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.45rem 0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span style={{
                    background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.625rem',
                    fontWeight: 800
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Location Search */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={14} style={{
            position: 'absolute',
            left: '0.875rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)'
          }} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search language, state, district, or city..."
            className="input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.75rem', width: '100%' }}
          />
          <span style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            padding: '0.15rem 0.4rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.625rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            /
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. ACTIVE TAB 1: LANGUAGES & SCRIPTS */}
      {/* ==================================================================== */}
      {activeTab === 'languages' && (
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)'
                }}>
                  <th style={{ padding: '0.875rem 1rem' }}>ID & Code</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Language Name</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Display Order</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {filteredLanguages.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No languages match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredLanguages.map((lang) => (
                    <tr
                      key={lang.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          fontFamily: 'var(--font-mono)',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                          {lang.code.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                          #{lang.id}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {lang.name}
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Priority #{lang.display_order || 1}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          background: lang.is_active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                          color: lang.is_active !== false ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          border: `1px solid ${lang.is_active !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                        }}>
                          {lang.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            onClick={() => handleOpenLanguageModal(lang)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.55rem' }}
                            title="Edit Language"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteLanguage(lang.id, lang.name)}
                            style={{
                              padding: '0.35rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.35)',
                              color: 'var(--accent-rose)',
                              cursor: 'pointer'
                            }}
                            title="Delete Language"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. ACTIVE TAB 2: STATES & TERRITORIES */}
      {/* ==================================================================== */}
      {activeTab === 'states' && (
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)'
                }}>
                  <th style={{ padding: '0.875rem 1rem' }}>ID</th>
                  <th style={{ padding: '0.875rem 1rem' }}>State / Territory</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Primary Language</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Districts Mapped</th>
                  <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {filteredStates.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No states match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredStates.map((state) => {
                    const distCount = districts.filter(d => d.state_id === state.id).length;
                    return (
                      <tr
                        key={state.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                      >
                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          #{state.id}
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {state.name}
                          </div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(99, 102, 241, 0.25)'
                          }}>
                            {state.language_name || 'Telugu / Multi'}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {distCount || state.districts_count || 0} districts
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            background: state.is_active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                            color: state.is_active !== false ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            border: `1px solid ${state.is_active !== false ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
                          }}>
                            {state.is_active !== false ? 'Operational' : 'Disabled'}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleOpenStateModal(state)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.55rem' }}
                              title="Edit State"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteState(state.id, state.name)}
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(244, 63, 94, 0.15)',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                color: 'var(--accent-rose)',
                                cursor: 'pointer'
                              }}
                              title="Delete State"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 6. ACTIVE TAB 3: ADMINISTRATIVE DISTRICTS */}
      {/* ==================================================================== */}
      {activeTab === 'districts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* District State Filter Toolbar */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Filter by State:</span>
              <select
                value={selectedStateFilter}
                onChange={(e) => setSelectedStateFilter(e.target.value)}
                className="input"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', width: 'auto' }}
              >
                <option value="all">All States ({states.length})</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredDistricts.length}</strong> districts
            </span>
          </div>

          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)'
                  }}>
                    <th style={{ padding: '0.875rem 1rem' }}>ID</th>
                    <th style={{ padding: '0.875rem 1rem' }}>District Name</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Parent State</th>
                    <th style={{ padding: '0.875rem 1rem' }}>Hyperlocal Towns / Wards</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {filteredDistricts.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No districts found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredDistricts.map((dist) => {
                      const cityCount = cities.filter(c => c.district_id === dist.id).length;
                      return (
                        <tr
                          key={dist.id}
                          style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                        >
                          <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            #{dist.id}
                          </td>

                          <td style={{ padding: '0.875rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {dist.name}
                            </div>
                          </td>

                          <td style={{ padding: '0.875rem 1rem' }}>
                            <span style={{
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.6875rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--accent-emerald)',
                              border: '1px solid rgba(16, 185, 129, 0.25)'
                            }}>
                              {dist.state_name || states.find(s => s.id === dist.state_id)?.name || 'Telangana'}
                            </span>
                          </td>

                          <td style={{ padding: '0.875rem 1rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {cityCount || dist.cities_count || 0} cities mapped
                            </span>
                          </td>

                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                              <button
                                onClick={() => handleOpenDistrictModal(dist)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.55rem' }}
                                title="Edit District"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteDistrict(dist.id, dist.name)}
                                style={{
                                  padding: '0.35rem 0.55rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.35)',
                                  color: 'var(--accent-rose)',
                                  cursor: 'pointer'
                                }}
                                title="Delete District"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 7. ACTIVE TAB 4: HYPERLOCAL CITIES & MUNICIPALITIES */}
      {/* ==================================================================== */}
      {activeTab === 'cities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* City District Filter Toolbar */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.875rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Filter by District:</span>
              <select
                value={selectedDistrictFilter}
                onChange={(e) => setSelectedDistrictFilter(e.target.value)}
                className="input"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', width: 'auto' }}
              >
                <option value="all">All Districts ({districts.length})</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.state_name || 'State'})</option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredCities.length}</strong> hyperlocal cities / wards
            </span>
          </div>

          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)'
                  }}>
                    <th style={{ padding: '0.875rem 1rem' }}>City ID</th>
                    <th style={{ padding: '0.875rem 1rem' }}>City / Hyperlocal Ward</th>
                    <th style={{ padding: '0.875rem 1rem' }}>District</th>
                    <th style={{ padding: '0.875rem 1rem' }}>State</th>
                    <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {filteredCities.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No cities found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCities.map((city) => (
                      <tr
                        key={city.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                      >
                        <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          #{city.id}
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={13} style={{ color: 'var(--accent-amber)' }} />
                            {city.name}
                          </div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            background: 'rgba(6, 182, 212, 0.12)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid rgba(6, 182, 212, 0.25)'
                          }}>
                            {city.district_name || 'District'}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--accent-emerald)',
                            border: '1px solid rgba(16, 185, 129, 0.25)'
                          }}>
                            {city.state_name || 'Telangana'}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button
                              onClick={() => handleOpenCityModal(city)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.55rem' }}
                              title="Edit City"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCity(city.id, city.name)}
                              style={{
                                padding: '0.35rem 0.55rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(244, 63, 94, 0.15)',
                                border: '1px solid rgba(244, 63, 94, 0.35)',
                                color: 'var(--accent-rose)',
                                cursor: 'pointer'
                              }}
                              title="Delete City"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 8. ACTIVE TAB 5: INTERACTIVE GEOGRAPHIC HIERARCHY TREE */}
      {/* ==================================================================== */}
      {activeTab === 'hierarchy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Interactive Geographic Cascading Drill-Down
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Expand any state to inspect its administrative district bounds and hyperlocal wards live via <code>/base/hierarchy/states/{'{state_id}'}</code>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {states.map((state) => {
                const isExpanded = !!expandedStates[state.id];
                const hierarchyData = stateHierarchies[state.id];
                const stateDists = hierarchyData ? hierarchyData.districts : districts.filter(d => d.state_id === state.id);

                return (
                  <div
                    key={state.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* State Level Node */}
                    <div
                      onClick={() => toggleStateHierarchy(state.id)}
                      style={{
                        padding: '0.875rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: 'var(--primary)' }}>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <Map size={18} style={{ color: 'var(--accent-emerald)' }} />
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                            {state.name}
                          </span>
                          <span style={{
                            fontSize: '0.6875rem',
                            color: 'var(--text-muted)',
                            marginLeft: '0.625rem',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            {state.language_name || 'Telugu'} • {stateDists.length} districts mapped
                          </span>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.6875rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-emerald)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        fontWeight: 700
                      }}>
                        State Level L1
                      </span>
                    </div>

                    {/* Districts Level Drill-Down */}
                    {isExpanded && (
                      <div style={{
                        padding: '0.5rem 1rem 0.875rem 2.5rem',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {stateDists.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                            No districts recorded for this state yet. Click "Add District" above to map new zones.
                          </div>
                        ) : (
                          stateDists.map((dist) => {
                            const isDistExpanded = !!expandedDistricts[dist.id];
                            const distCities = dist.cities || cities.filter(c => c.district_id === dist.id);

                            return (
                              <div
                                key={dist.id}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-sm)',
                                  overflow: 'hidden'
                                }}
                              >
                                <div
                                  onClick={() => toggleDistrictHierarchy(dist.id)}
                                  style={{
                                    padding: '0.5rem 0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                      {isDistExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                    <Building2 size={14} style={{ color: 'var(--accent-cyan)' }} />
                                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                                      {dist.name} District
                                    </span>
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                      ({distCities.length} towns/wards)
                                    </span>
                                  </div>

                                  <span style={{
                                    fontSize: '0.625rem',
                                    color: 'var(--accent-cyan)',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                  }}>
                                    District L2
                                  </span>
                                </div>

                                {/* Cities Level Nodes */}
                                {isDistExpanded && (
                                  <div style={{
                                    padding: '0.5rem 0.75rem 0.5rem 2rem',
                                    borderTop: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.375rem'
                                  }}>
                                    {distCities.length === 0 ? (
                                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No wards mapped in this district yet.
                                      </span>
                                    ) : (
                                      distCities.map((city) => (
                                        <span
                                          key={city.id}
                                          style={{
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'rgba(245, 158, 11, 0.12)',
                                            border: '1px solid rgba(245, 158, 11, 0.25)',
                                            fontSize: '0.6875rem',
                                            fontWeight: 600,
                                            color: 'var(--accent-amber)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                          }}
                                        >
                                          <MapPin size={10} />
                                          {city.name}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ACTIVE TAB 5: CONTENT CATEGORIES & TAXONOMIES */}
      {/* ==================================================================== */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subheader & Action Bar */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c084fc'
              }}>
                <Layers size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Content Desks & Taxonomy Master
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {categories.length} Registered Categories • Multi-lingual classification & editorial routing
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenCategoryModal()}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
            >
              <Plus size={15} />
              <span>Create Category</span>
            </button>
          </div>

          {/* Categories Visual Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '1rem'
          }}>
            {categories
              .filter(cat => !searchQuery || cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase())))
              .map(cat => {
                const isSelected = editingItem?.id === cat.id && modalType === 'category';
                return (
                  <div
                    key={cat.id}
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: `1px solid ${cat.color ? `${cat.color}40` : 'var(--glass-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Top Accent Stripe */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: cat.color || 'var(--primary)'
                    }} />

                    <div>
                      {/* Top Badges Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: cat.color || '#1E88E5',
                            boxShadow: `0 0 8px ${cat.color || '#1E88E5'}`
                          }} />
                          <span style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-muted)'
                          }}>
                            {cat.color || '#1E88E5'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            fontSize: '0.625rem',
                            fontWeight: 800,
                            color: 'var(--text-muted)'
                          }}>
                            ORDER #{cat.display_order || 1}
                          </span>

                          <button
                            onClick={() => handleToggleCategoryActive(cat)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title="Click to toggle status"
                          >
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-full)',
                              background: cat.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              border: `1px solid ${cat.is_active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              color: cat.is_active ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                            }}>
                              {cat.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Title & Icon Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              borderRadius: 'var(--radius-md)',
                              objectFit: 'cover',
                              border: '1px solid var(--border-subtle)'
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            borderRadius: 'var(--radius-md)',
                            background: `${cat.color || '#1E88E5'}25`,
                            border: `1px solid ${cat.color || '#1E88E5'}50`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: cat.color || '#1E88E5',
                            fontWeight: 800,
                            fontSize: '1rem'
                          }}>
                            {cat.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                            {cat.name}
                          </h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            ID: #{cat.id}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        minHeight: '2.2rem'
                      }}>
                        {cat.description || 'No description provided for this editorial desk.'}
                      </p>
                    </div>

                    {/* Footer Metrics & Actions */}
                    <div style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cat.news_count || 0}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          articles published
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <button
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Edit Category"
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          style={{
                            padding: '0.3rem 0.45rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: 'var(--accent-rose)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Delete Category"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ACTIVE TAB 6: HYPERLOCAL & REGIONAL EVENTS */}
      {/* ==================================================================== */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subheader & Subfilters */}
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Events', count: events.length },
                { id: 'approved', label: 'Approved Live', count: events.filter(e => e.is_approved).length },
                { id: 'pending', label: 'Pending Moderation', count: events.filter(e => !e.is_approved).length, highlight: true },
                { id: 'online', label: 'Virtual / Webinars', count: events.filter(e => e.is_online).length }
              ].map(f => {
                const isCurrent = eventsFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setEventsFilter(f.id)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      border: isCurrent ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                      background: isCurrent ? 'var(--primary)' : f.highlight && f.count > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      color: isCurrent ? '#ffffff' : f.highlight && f.count > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{f.label}</span>
                    <span style={{
                      padding: '0.1rem 0.375rem',
                      borderRadius: 'var(--radius-full)',
                      background: isCurrent ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      fontSize: '0.625rem',
                      fontWeight: 800
                    }}>
                      {f.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={selectedEventState}
                onChange={(e) => setSelectedEventState(e.target.value)}
                className="input"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
              >
                <option value="all">All States</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button
                onClick={() => handleOpenEventModal()}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}
              >
                <Plus size={15} />
                <span>Host / Create Event</span>
              </button>
            </div>
          </div>

          {/* Events Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.25rem'
          }}>
            {events
              .filter(ev => {
                if (eventsFilter === 'approved' && !ev.is_approved) return false;
                if (eventsFilter === 'pending' && ev.is_approved) return false;
                if (eventsFilter === 'online' && !ev.is_online) return false;
                if (selectedEventState !== 'all' && Number(ev.state_id) !== Number(selectedEventState)) return false;
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  return (
                    (ev.title && ev.title.toLowerCase().includes(q)) ||
                    (ev.description && ev.description.toLowerCase().includes(q)) ||
                    (ev.location && ev.location.toLowerCase().includes(q)) ||
                    (ev.city_name && ev.city_name.toLowerCase().includes(q))
                  );
                }
                return true;
              })
              .map(ev => {
                const eventDateObj = ev.event_date ? new Date(ev.event_date) : new Date();
                const monthStr = eventDateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const dayStr = eventDateObj.getDate();

                return (
                  <div
                    key={ev.id}
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: `1px solid ${ev.is_approved ? 'var(--glass-border)' : 'rgba(245, 158, 11, 0.4)'}`,
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Top Media Banner */}
                    <div style={{
                      position: 'relative',
                      height: '140px',
                      background: '#0a0f1d',
                      overflow: 'hidden'
                    }}>
                      {ev.image_url ? (
                        <img
                          src={ev.image_url}
                          alt={ev.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(244, 63, 94, 0.2) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)'
                        }}>
                          <CalendarDays size={36} style={{ opacity: 0.4 }} />
                        </div>
                      )}

                      {/* Date Badge Overlay */}
                      <div style={{
                        position: 'absolute',
                        top: '0.75rem',
                        left: '0.75rem',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.35rem 0.6rem',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                      }}>
                        <div style={{ fontSize: '0.625rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>
                          {monthStr}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.1 }}>
                          {dayStr}
                        </div>
                      </div>

                      {/* Status Beacon Top Right */}
                      <div style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-full)',
                          background: ev.is_approved ? 'rgba(16, 185, 129, 0.85)' : 'rgba(245, 158, 11, 0.85)',
                          backdropFilter: 'blur(8px)',
                          color: '#ffffff',
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                        }}>
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#ffffff'
                          }} />
                          {ev.is_approved ? 'Approved Live' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                      {/* Venue / Online Mode Chip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {ev.is_online ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: 'var(--primary)'
                          }}>
                            <Radio size={11} />
                            Virtual Webinar / Online
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: 'var(--accent-emerald)'
                          }}>
                            <MapPin size={11} />
                            Physical Venue
                          </span>
                        )}

                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          <Clock size={11} />
                          {ev.start_time || '10:00 AM'} - {ev.end_time || '01:00 PM'}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        margin: 0,
                        lineHeight: 1.35
                      }}>
                        {ev.title}
                      </h4>

                      {/* Description */}
                      <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {ev.description}
                      </p>

                      {/* Location Details */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.375rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                        <MapPin size={13} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                        <span style={{ wordBreak: 'break-word' }}>
                          {ev.location || (ev.event_url ? `Online URL: ${ev.event_url}` : 'Venue TBA')}
                        </span>
                      </div>

                      {/* Geographic Tag Chips */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                        {ev.state_name && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)'
                          }}>
                            {ev.state_name}
                          </span>
                        )}
                        {ev.district_name && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)'
                          }}>
                            {ev.district_name}
                          </span>
                        )}
                        {ev.city_name && (
                          <span style={{
                            padding: '0.15rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: 'var(--accent-amber)'
                          }}>
                            {ev.city_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Action Bar */}
                    <div style={{
                      padding: '0.75rem 1.25rem',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      {/* Left: View Dossier */}
                      <button
                        onClick={() => handleOpenEventDetail(ev)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Eye size={13} />
                        <span>Dossier</span>
                      </button>

                      {/* Right: Approve/Reject or Edit/Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        {!ev.is_approved ? (
                          <>
                            <button
                              onClick={() => handleApproveEvent(ev.id, true)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                color: 'var(--accent-emerald)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Approve Event & Publish Live"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectionModal({ isOpen: true, eventId: ev.id, eventTitle: ev.title, reason: '' })}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'var(--accent-rose)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              title="Reject Event"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenEventModal(ev)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                              title="Edit Event"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id, ev.title)}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: 'var(--accent-rose)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                              title="Delete Event"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 9. MODAL: ADD / EDIT LANGUAGE */}
      {/* ==================================================================== */}
      {modalType === 'language' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingItem ? 'Edit Language & Script' : 'Register New Language'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLanguage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  ISO 639 Language Code (e.g. te, en, hi, ta)
                </label>
                <input
                  type="text"
                  required
                  value={langForm.code}
                  onChange={(e) => setLangForm({ ...langForm, code: e.target.value.toLowerCase() })}
                  className="input"
                  placeholder="e.g. te"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Language Name
                </label>
                <input
                  type="text"
                  required
                  value={langForm.name}
                  onChange={(e) => setLangForm({ ...langForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Telugu"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Display Priority Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={langForm.display_order}
                  onChange={(e) => setLangForm({ ...langForm, display_order: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="langActive"
                  checked={langForm.is_active}
                  onChange={(e) => setLangForm({ ...langForm, is_active: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="langActive" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Enable for reader selection & news publishing
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Language'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 10. MODAL: ADD / EDIT STATE */}
      {/* ==================================================================== */}
      {modalType === 'state' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Map size={20} style={{ color: 'var(--accent-emerald)' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingItem ? 'Edit State / Territory' : 'Add State / Territory'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveState} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  State Name
                </label>
                <input
                  type="text"
                  required
                  value={stateForm.name}
                  onChange={(e) => setStateForm({ ...stateForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Telangana"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Default Primary Language
                </label>
                <select
                  value={stateForm.language_id}
                  onChange={(e) => setStateForm({ ...stateForm, language_id: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  {languages.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.code.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="stateActive"
                  checked={stateForm.is_active}
                  onChange={(e) => setStateForm({ ...stateForm, is_active: e.target.checked })}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="stateActive" style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Active state for geo-targeted news distribution
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Register State'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 11. MODAL: ADD / EDIT DISTRICT */}
      {/* ==================================================================== */}
      {modalType === 'district' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingItem ? 'Edit District' : 'Map New District'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDistrict} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Parent State
                </label>
                <select
                  value={distForm.state_id}
                  onChange={(e) => setDistForm({ ...distForm, state_id: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  {states.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  District Name
                </label>
                <input
                  type="text"
                  required
                  value={distForm.name}
                  onChange={(e) => setDistForm({ ...distForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Hyderabad"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Map District'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 12. MODAL: ADD / EDIT CITY / WARD */}
      {/* ==================================================================== */}
      {modalType === 'city' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={20} style={{ color: 'var(--accent-amber)' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingItem ? 'Edit City / Ward' : 'Pin Hyperlocal City / Ward'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCity} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Parent District
                </label>
                <select
                  value={cityForm.district_id}
                  onChange={(e) => setCityForm({ ...cityForm, district_id: Number(e.target.value) })}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.state_name || 'State'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  City / Hyperlocal Ward Name
                </label>
                <input
                  type="text"
                  required
                  value={cityForm.name}
                  onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Hitec City"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Pin City / Ward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 13. MODAL: ADD / EDIT CONTENT CATEGORY */}
      {/* ==================================================================== */}
      {modalType === 'category' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} style={{ color: '#c084fc' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingItem ? 'Edit Content Category' : 'Create New Content Category'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input"
                  placeholder="e.g. Technology, Civic Affairs, Politics"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Accent Color (Hex) & Palette
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="color"
                    value={categoryForm.color || '#1E88E5'}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                  />
                  <input
                    type="text"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="input"
                    placeholder="#1E88E5"
                    style={{ width: '120px', fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                {/* Color Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {['#1E88E5', '#D32F2F', '#43A047', '#00897B', '#3949AB', '#7CB342', '#EC407A', '#F59E0B', '#7C3AED'].map(colorCode => (
                    <button
                      type="button"
                      key={colorCode}
                      onClick={() => setCategoryForm({ ...categoryForm, color: colorCode })}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: colorCode,
                        border: categoryForm.color === colorCode ? '2px solid #ffffff' : '1px solid transparent',
                        cursor: 'pointer'
                      }}
                      title={colorCode}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Icon or Thumbnail Image URL
                </label>
                <input
                  type="url"
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                  className="input"
                  placeholder="https://example.com/icons/tech.png"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input"
                  placeholder="Brief summary of news topics covered under this editorial category..."
                  style={{ width: '100%', fontSize: '0.8125rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                    Operational Status
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      Active (Visible in Apps)
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 14. MODAL: HOST / CREATE HYPERLOCAL EVENT */}
      {/* ==================================================================== */}
      {modalType === 'event' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '580px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={20} style={{ color: '#fb7185' }} />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {editingItem ? 'Edit Hyperlocal Event' : 'Host / Register Hyperlocal Event'}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.125rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="input"
                  placeholder="e.g. Hyderabad AI & Civic Technology Summit 2026"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Description & Agenda *
                </label>
                <textarea
                  rows={3}
                  required
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="input"
                  placeholder="Key topics, keynote speakers, intended audience, and schedule breakdown..."
                  style={{ width: '100%', fontSize: '0.8125rem', resize: 'vertical' }}
                />
              </div>

              {/* Date & Time Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                    className="input"
                    placeholder="09:30 AM"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    End Time
                  </label>
                  <input
                    type="text"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                    className="input"
                    placeholder="05:30 PM"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  />
                </div>
              </div>

              {/* Physical vs Online Toggle */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={eventForm.is_online}
                    onChange={(e) => setEventForm({ ...eventForm, is_online: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    This is a Virtual / Online Webinar or Stream
                  </span>
                </label>

                {eventForm.is_online ? (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      Webinar / Stream URL *
                    </label>
                    <input
                      type="url"
                      required={eventForm.is_online}
                      value={eventForm.event_url}
                      onChange={(e) => setEventForm({ ...eventForm, event_url: e.target.value })}
                      className="input"
                      placeholder="https://zoom.us/j/... or https://youtube.com/live/..."
                      style={{ width: '100%', fontSize: '0.8125rem' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                      Physical Venue Address & Landmark *
                    </label>
                    <input
                      type="text"
                      required={!eventForm.is_online}
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      className="input"
                      placeholder="e.g. HITEX Exhibition Center, Hitec City, Hyderabad"
                      style={{ width: '100%', fontSize: '0.8125rem' }}
                    />
                  </div>
                )}
              </div>

              {/* Geographic Binding Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Target State *
                  </label>
                  <select
                    value={eventForm.state_id}
                    onChange={(e) => {
                      const sId = Number(e.target.value);
                      const relatedDists = districts.filter(d => d.state_id === sId);
                      setEventForm({
                        ...eventForm,
                        state_id: sId,
                        district_id: relatedDists[0]?.id || 1,
                        city_id: cities.filter(c => c.district_id === (relatedDists[0]?.id || 1))[0]?.id || 1
                      });
                    }}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  >
                    {states.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Target District *
                  </label>
                  <select
                    value={eventForm.district_id}
                    onChange={(e) => {
                      const dId = Number(e.target.value);
                      const relatedCities = cities.filter(c => c.district_id === dId);
                      setEventForm({
                        ...eventForm,
                        district_id: dId,
                        city_id: relatedCities[0]?.id || 1
                      });
                    }}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  >
                    {districts
                      .filter(d => !eventForm.state_id || d.state_id === Number(eventForm.state_id))
                      .map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Target City / Hyperlocal Ward
                  </label>
                  <select
                    value={eventForm.city_id}
                    onChange={(e) => setEventForm({ ...eventForm, city_id: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  >
                    {cities
                      .filter(c => !eventForm.district_id || c.district_id === Number(eventForm.district_id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Primary Event Language
                  </label>
                  <select
                    value={eventForm.language_id}
                    onChange={(e) => setEventForm({ ...eventForm, language_id: Number(e.target.value) })}
                    className="input"
                    style={{ width: '100%', fontSize: '0.8125rem' }}
                  >
                    {languages.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Banner Image URL (Unsplash or CDN)
                </label>
                <input
                  type="url"
                  value={eventForm.image_url}
                  onChange={(e) => setEventForm({ ...eventForm, image_url: e.target.value })}
                  className="input"
                  placeholder="https://images.unsplash.com/photo-..."
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => setModalType(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Save Changes' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 15. MODAL: EVENT INVESTIGATION & APPROVAL DOSSIER */}
      {/* ==================================================================== */}
      {modalType === 'event_detail' && eventDetailItem && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '560px',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            {/* Header Image */}
            <div style={{ position: 'relative', height: '160px', background: '#0a0f1d' }}>
              {eventDetailItem.image_url ? (
                <img
                  src={eventDetailItem.image_url}
                  alt={eventDetailItem.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(244, 63, 94, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CalendarDays size={40} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
              <button
                onClick={() => setModalType(null)}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    background: eventDetailItem.is_approved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${eventDetailItem.is_approved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    color: eventDetailItem.is_approved ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                  }}>
                    {eventDetailItem.is_approved ? 'Approved & Live' : 'Pending Verification'}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    UID: {eventDetailItem.event_uid}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {eventDetailItem.title}
                </h3>
              </div>

              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {eventDetailItem.description}
              </p>

              {/* Metadata Grid */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                fontSize: '0.75rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Date & Timing</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {eventDetailItem.event_date ? new Date(eventDetailItem.event_date).toLocaleDateString() : 'TBA'} • {eventDetailItem.start_time || '10:00 AM'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Location Format</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {eventDetailItem.is_online ? 'Virtual Webinar / Stream' : 'Physical In-Person'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Geographic Binding</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {eventDetailItem.state_name || 'State'} › {eventDetailItem.district_name || 'District'} › {eventDetailItem.city_name || 'City'}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Submitted By</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {eventDetailItem.created_by || 'Staff'}
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                {!eventDetailItem.is_approved ? (
                  <>
                    <button
                      onClick={() => {
                        handleApproveEvent(eventDetailItem.id, true);
                        setModalType(null);
                      }}
                      className="btn btn-primary"
                      style={{ background: 'var(--accent-emerald)' }}
                    >
                      Approve & Publish Live
                    </button>
                    <button
                      onClick={() => {
                        setModalType(null);
                        setRejectionModal({ isOpen: true, eventId: eventDetailItem.id, eventTitle: eventDetailItem.title, reason: '' });
                      }}
                      className="btn btn-secondary"
                      style={{ color: 'var(--accent-rose)' }}
                    >
                      Reject Submission
                    </button>
                  </>
                ) : (
                  <button onClick={() => setModalType(null)} className="btn btn-secondary">
                    Close Dossier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 16. MODAL: EVENT REJECTION REASON */}
      {/* ==================================================================== */}
      {rejectionModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.15s ease'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} style={{ color: 'var(--accent-rose)' }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Reject Event Submission
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Provide a reason for rejecting <strong>"{rejectionModal.eventTitle}"</strong>. This will be logged in the moderation audit trail.
            </p>

            <textarea
              rows={3}
              value={rejectionModal.reason}
              onChange={(e) => setRejectionModal({ ...rejectionModal, reason: e.target.value })}
              className="input"
              placeholder="e.g. Venue verification failed, commercial spam, or duplicate submission..."
              style={{ width: '100%', fontSize: '0.8125rem', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRejectionModal({ isOpen: false, eventId: null, eventTitle: '', reason: '' })}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApproveEvent(rejectionModal.eventId, false, rejectionModal.reason);
                  setRejectionModal({ isOpen: false, eventId: null, eventTitle: '', reason: '' });
                }}
                className="btn btn-primary"
                style={{ background: 'var(--accent-rose)' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
