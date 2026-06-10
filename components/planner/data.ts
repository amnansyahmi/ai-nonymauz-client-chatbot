import type { BudgetItem, Message, PlannerProfile, Vendor } from './types';

export const starterQuestions = [
  'Create a wedding checklist for 100 guests.',
  'Help me plan a nikah and sanding timeline.',
  'What should I ask a wedding photographer?',
  'Create a checklist for venue viewing.',
  'Add appointment on 20 June at 3pm for food tasting.'
];

export const defaultAssistantMessage: Message = {
  role: 'assistant',
  content:
    'Hi! Saya MajlisMate.ai, your wedding planning assistant. Ask about majlis timelines, vendors, budget, guest planning, or ask me to create a checklist or appointment.'
};

export const storageKeys = {
  messages: 'majlismate.messages',
  activeTab: 'majlismate.activeTab',
  checklistTitle: 'majlismate.checklistTitle',
  checklistItems: 'majlismate.checklistItems',
  appointments: 'majlismate.appointments',
  calendarMonth: 'majlismate.calendarMonth',
  plannerProfile: 'majlismate.plannerProfile',
  budgetItems: 'majlismate.budgetItems',
  guests: 'majlismate.guests',
  savedVendors: 'majlismate.savedVendors',
  activity: 'majlismate.activity'
};

export const defaultPlannerProfile: PlannerProfile = {
  coupleName: '',
  groomName: '',
  brideName: '',
  majlisDate: '',
  negeri: 'Selangor',
  totalBudget: 30000,
  guestTarget: 300,
  completed: false
};

export const defaultChecklistTemplate = [
  {
    phase: 'Fasa 1 - Asas',
    items: [
      'Isi maklumat majlis',
      'Confirm tarikh majlis dengan keluarga dua belah',
      'Apply permohonan nikah online',
      'Daftar kursus pra-perkahwinan',
      'Tempah jurunikah',
      'Tetapkan bajet keseluruhan',
      'Tempah dewan / lokasi majlis',
      'Bayar deposit dewan'
    ]
  },
  {
    phase: 'Fasa 2 - Vendor Utama',
    items: [
      'Tempah katerer ATAU confirm orang rewang',
      'Tempah jurufoto & juruvideo',
      'Tempah juruandam / makeup',
      'Survey & tempah baju pengantin',
      'Buat fitting baju pengantin',
      'Settle hantaran dua belah',
      'Tempah penghias majlis',
      'Tempah PA system & MC'
    ]
  },
  {
    phase: 'Fasa 3 - Persediaan',
    items: [
      'Siapkan senarai tetamu penuh',
      'Hantar jemputan & setup RSVP',
      'Hantar reminder RSVP',
      'Confirm headcount & bagi ke katerer',
      'Tempah cenderahati',
      'Confirm semua vendor',
      'Briefing kepada pembantu & keluarga'
    ]
  },
  {
    phase: 'Fasa 4 - Final',
    items: [
      'Confirm semua vendor seminggu sebelum',
      'Bagi nombor final ke katerer 5 hari sebelum',
      'Briefing terakhir semua pembantu',
      'Confirm parking & pengangkutan',
      'Confirm penginapan tetamu jauh',
      'Prepare barang penting hari majlis',
      'Rehat & serah urusan kepada pembantu'
    ]
  }
];

export const defaultBudgetItems: BudgetItem[] = [
  'Venue / Dewan',
  'Catering',
  'Pelamin & Dekorasi',
  'Baju Pengantin',
  'Andaman / MUA',
  'Photography',
  'Videography',
  'Kad Jemputan',
  'Cenderahati',
  'Hantaran',
  'Kompang & Hiburan',
  'Transport',
  'Penginapan',
  'Contingency'
].map((category, index) => ({
  id: `budget-${index}`,
  category,
  planned: 0,
  actual: 0,
  paid: 0,
  status: 'not-started',
  note: ''
}));

export const vendorDirectory: Vendor[] = [
  {
    id: 'vendor-caterer-selangor',
    name: 'Seri Rasa Catering',
    category: 'Katerer',
    negeri: 'Selangor',
    minPrice: 18,
    maxPrice: 45,
    contact: '012-345 6789',
    instagram: '@serirasa.catering',
    rating: 4.8,
    note: 'Buffet, dome, and small majlis packages around Klang Valley.'
  },
  {
    id: 'vendor-photo-kl',
    name: 'Lensa Cinta Studio',
    category: 'Jurufoto & Juruvideo',
    negeri: 'Kuala Lumpur',
    minPrice: 1800,
    maxPrice: 5200,
    contact: '011-222 3344',
    instagram: '@lensacinta',
    rating: 4.7,
    note: 'Nikah, sanding, outdoor, and highlight video packages.'
  },
  {
    id: 'vendor-mua-johor',
    name: 'Ayu Bridal Touch',
    category: 'Andaman/MUA',
    negeri: 'Johor',
    minPrice: 900,
    maxPrice: 2800,
    contact: '013-888 1212',
    instagram: '@ayubridal.touch',
    rating: 4.9,
    note: 'Makeup, styling, and rental baju options.'
  },
  {
    id: 'vendor-decor-penang',
    name: 'Bunga Seri Decor',
    category: 'Pelamin & Dekorasi',
    negeri: 'Penang',
    minPrice: 1500,
    maxPrice: 6500,
    contact: '017-555 9191',
    instagram: '@bungaseridecor',
    rating: 4.6,
    note: 'Pelamin, walkway, meja makan beradab, and fresh flower add-ons.'
  },
  {
    id: 'vendor-venue-selangor',
    name: 'Dewan Meranti Hall',
    category: 'Dewan & Venue',
    negeri: 'Selangor',
    minPrice: 3500,
    maxPrice: 12000,
    contact: '03-1234 7788',
    rating: 4.5,
    note: 'Indoor hall, parking, bridal room, and basic PA included.'
  }
];

export const checklistTemplates = [
  {
    title: 'PRD default wedding checklist',
    items: defaultChecklistTemplate.flatMap((group) => group.items)
  },
  {
    title: '12-month wedding checklist',
    items: [
      'Set wedding date and planning budget',
      'Confirm estimated guest count',
      'Shortlist venue or dewan options',
      'Book nikah, sanding, or reception venue',
      'Compare catering, decor, photo, video, and makeup vendors',
      'Prepare invitation and RSVP plan',
      'Confirm attire, fitting dates, and accessories',
      'Create event day timeline',
      'Confirm final vendor balances and contact persons',
      'Prepare emergency kit and final family briefing'
    ]
  },
  {
    title: 'Nikah checklist',
    items: [
      'Confirm nikah date, time, and location',
      'Check required documents with the relevant authority',
      'Prepare wali, witnesses, and family seating',
      'Confirm tok kadi or officiant details',
      'Prepare mas kahwin, rings, and hantaran items',
      'Confirm attire, makeup, and photographer timing',
      'Prepare simple post-nikah photo session plan'
    ]
  },
  {
    title: 'Sanding day timeline',
    items: [
      'Vendor arrival and setup check',
      'Makeup and outfit preparation',
      'Family photo session',
      'Guest arrival and reception opening',
      'Couple entrance',
      'Meal service and table rounds',
      'Cake cutting or special program',
      'Final photography session',
      'Vendor teardown and item handover'
    ]
  },
  {
    title: 'Vendor meeting questions',
    items: [
      'Are you available on our wedding date?',
      'What is included in the package?',
      'What is the payment schedule and deposit amount?',
      'Are there overtime or transport fees?',
      'Who is the event-day contact person?',
      'What is your cancellation or postponement policy?',
      'Can we see recent portfolio examples?',
      'What do you need from us before the wedding day?'
    ]
  },
  {
    title: 'Wedding budget categories',
    items: [
      'Venue or dewan',
      'Catering',
      'Decor and pelamin',
      'Attire and accessories',
      'Makeup and styling',
      'Photography and videography',
      'Invitation and stationery',
      'Hantaran and gifts',
      'Transport and accommodation',
      'Contingency fund'
    ]
  }
];
