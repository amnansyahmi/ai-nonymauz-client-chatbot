import type { AppLanguage, BudgetItem, Message, PlannerProfile, Vendor } from './types';

export type LocalizedText = {
  ms: string;
  en: string;
};

export type ChecklistTemplateItem = LocalizedText & {
  phase?: LocalizedText;
};

export type ChecklistTemplate = {
  title: LocalizedText;
  items: ChecklistTemplateItem[];
};

export const languageLabels: Record<AppLanguage, string> = {
  ms: 'BM',
  en: 'EN'
};

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
  chatSessions: 'majlismate.chatSessions',
  currentChatId: 'majlismate.currentChatId',
  activeTab: 'majlismate.activeTab',
  checklistTitle: 'majlismate.checklistTitle',
  checklistItems: 'majlismate.checklistItems',
  appointments: 'majlismate.appointments',
  calendarMonth: 'majlismate.calendarMonth',
  plannerProfile: 'majlismate.plannerProfile',
  budgetItems: 'majlismate.budgetItems',
  guests: 'majlismate.guests',
  savedVendors: 'majlismate.savedVendors',
  activity: 'majlismate.activity',
  language: 'majlismate.language'
};

export const defaultPlannerProfile: PlannerProfile = {
  coupleName: '',
  groomName: '',
  brideName: '',
  majlisDate: '',
  negeri: 'Selangor',
  totalBudget: 30000,
  guestTarget: 300,
  weddingStyle: '',
  keyContact: '',
  completed: false
};

export const defaultChecklistTemplate = [
  {
    phase: { ms: 'Fasa 1 - Asas', en: 'Phase 1 - Foundation' },
    items: [
      { ms: 'Isi maklumat majlis', en: 'Fill in wedding details' },
      { ms: 'Confirm tarikh majlis dengan keluarga dua belah', en: 'Confirm the wedding date with both families' },
      { ms: 'Apply permohonan nikah online', en: 'Submit the online nikah application' },
      { ms: 'Daftar kursus pra-perkahwinan', en: 'Register for the pre-marriage course' },
      { ms: 'Tempah jurunikah', en: 'Book the marriage officiant' },
      { ms: 'Tetapkan bajet keseluruhan', en: 'Set the overall wedding budget' },
      { ms: 'Tempah dewan / lokasi majlis', en: 'Book the hall or wedding venue' },
      { ms: 'Bayar deposit dewan', en: 'Pay the venue deposit' }
    ]
  },
  {
    phase: { ms: 'Fasa 2 - Vendor Utama', en: 'Phase 2 - Main Vendors' },
    items: [
      { ms: 'Tempah katerer ATAU confirm orang rewang', en: 'Book catering or confirm the rewang team' },
      { ms: 'Tempah jurufoto & juruvideo', en: 'Book photographer and videographer' },
      { ms: 'Tempah juruandam / makeup', en: 'Book makeup or bridal styling' },
      { ms: 'Survey & tempah baju pengantin', en: 'Survey and book wedding attire' },
      { ms: 'Buat fitting baju pengantin', en: 'Schedule wedding attire fitting' },
      { ms: 'Settle hantaran dua belah', en: 'Finalize hantaran for both sides' },
      { ms: 'Tempah penghias majlis', en: 'Book wedding decorator' },
      { ms: 'Tempah PA system & MC', en: 'Book PA system and emcee' }
    ]
  },
  {
    phase: { ms: 'Fasa 3 - Persediaan', en: 'Phase 3 - Preparation' },
    items: [
      { ms: 'Siapkan senarai tetamu penuh', en: 'Complete the full guest list' },
      { ms: 'Hantar jemputan & setup RSVP', en: 'Send invitations and set up RSVP' },
      { ms: 'Hantar reminder RSVP', en: 'Send RSVP reminders' },
      { ms: 'Confirm headcount & bagi ke katerer', en: 'Confirm headcount and share it with the caterer' },
      { ms: 'Tempah cenderahati', en: 'Order wedding favors' },
      { ms: 'Confirm semua vendor', en: 'Confirm all vendors' },
      { ms: 'Briefing kepada pembantu & keluarga', en: 'Brief helpers and family members' }
    ]
  },
  {
    phase: { ms: 'Fasa 4 - Final', en: 'Phase 4 - Final' },
    items: [
      { ms: 'Confirm semua vendor seminggu sebelum', en: 'Confirm all vendors one week before' },
      { ms: 'Bagi nombor final ke katerer 5 hari sebelum', en: 'Give the final number to the caterer five days before' },
      { ms: 'Briefing terakhir semua pembantu', en: 'Run the final briefing with all helpers' },
      { ms: 'Confirm parking & pengangkutan', en: 'Confirm parking and transport' },
      { ms: 'Confirm penginapan tetamu jauh', en: 'Confirm accommodation for outstation guests' },
      { ms: 'Prepare barang penting hari majlis', en: 'Prepare important wedding-day items' },
      { ms: 'Rehat & serah urusan kepada pembantu', en: 'Rest and hand over tasks to helpers' }
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

export const budgetSuggestions: BudgetItem[] = [
  { id: 'suggestion-khemah', category: 'Khemah / Canopy', planned: 2500, actual: 0, paid: 0, status: 'not-started', note: 'Backup if venue needs outdoor cover, walkway, or extra seating.' },
  { id: 'suggestion-lighting', category: 'Lighting & Ambience', planned: 1200, actual: 0, paid: 0, status: 'not-started', note: 'Fairy lights, spotlight, backdrop lighting, or outdoor lighting.' },
  { id: 'suggestion-sound', category: 'PA System / Sound', planned: 900, actual: 0, paid: 0, status: 'not-started', note: 'Mic, speakers, basic sound tech, or ceremony audio.' },
  { id: 'suggestion-mc', category: 'MC / Pengacara Majlis', planned: 700, actual: 0, paid: 0, status: 'not-started', note: 'Host, emcee, or flow coordinator for reception.' },
  { id: 'suggestion-door-gift', category: 'Door Gift Extra', planned: 1000, actual: 0, paid: 0, status: 'not-started', note: 'Extra favors for family, VIP, or last-minute guests.' },
  { id: 'suggestion-stationery', category: 'Signage & Stationery', planned: 450, actual: 0, paid: 0, status: 'not-started', note: 'Welcome sign, seating labels, tent cards, menus, or stickers.' },
  { id: 'suggestion-parking', category: 'Parking / Rela', planned: 600, actual: 0, paid: 0, status: 'not-started', note: 'Parking attendants, cones, signage, or traffic support.' },
  { id: 'suggestion-cleaning', category: 'Cleaning / Waste', planned: 500, actual: 0, paid: 0, status: 'not-started', note: 'Post-event cleanup, bins, or venue cleaning fee.' },
  { id: 'suggestion-family-attire', category: 'Family Attire', planned: 1800, actual: 0, paid: 0, status: 'not-started', note: 'Parents, siblings, bridesmaids, or groomsmen outfits.' },
  { id: 'suggestion-beauty-prep', category: 'Beauty Prep', planned: 400, actual: 0, paid: 0, status: 'not-started', note: 'Facial, nails, hair treatment, or grooming before majlis.' },
  { id: 'suggestion-meal-crew', category: 'Crew / Family Meals', planned: 700, actual: 0, paid: 0, status: 'not-started', note: 'Meals for helpers, vendors, family, or rehearsal day.' },
  { id: 'suggestion-emergency', category: 'Emergency Buffer', planned: 1500, actual: 0, paid: 0, status: 'not-started', note: 'Last-minute printing, transport, extra pax, or unexpected vendor charges.' }
];

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

export const checklistTemplates: ChecklistTemplate[] = [
  {
    title: { ms: 'Checklist Perkahwinan', en: 'Wedding Checklist' },
    items: defaultChecklistTemplate.flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        phase: group.phase
      }))
    )
  },
  {
    title: { ms: 'Checklist 12 bulan', en: '12-month wedding checklist' },
    items: [
      { ms: 'Tetapkan tarikh kahwin dan bajet', en: 'Set wedding date and planning budget' },
      { ms: 'Confirm anggaran jumlah tetamu', en: 'Confirm estimated guest count' },
      { ms: 'Shortlist pilihan venue atau dewan', en: 'Shortlist venue or hall options' },
      { ms: 'Tempah lokasi nikah, sanding, atau reception', en: 'Book nikah, sanding, or reception venue' },
      { ms: 'Bandingkan vendor katering, dekor, foto, video, dan makeup', en: 'Compare catering, decor, photo, video, and makeup vendors' },
      { ms: 'Sediakan pelan jemputan dan RSVP', en: 'Prepare invitation and RSVP plan' },
      { ms: 'Confirm baju, tarikh fitting, dan aksesori', en: 'Confirm attire, fitting dates, and accessories' },
      { ms: 'Bina timeline hari majlis', en: 'Create the event-day timeline' },
      { ms: 'Confirm baki bayaran vendor dan contact person', en: 'Confirm final vendor balances and contact persons' },
      { ms: 'Sediakan emergency kit dan briefing keluarga', en: 'Prepare emergency kit and final family briefing' }
    ]
  },
  {
    title: { ms: 'Checklist nikah', en: 'Nikah checklist' },
    items: [
      { ms: 'Confirm tarikh, masa, dan lokasi nikah', en: 'Confirm nikah date, time, and location' },
      { ms: 'Semak dokumen wajib dengan pejabat agama', en: 'Check required documents with the relevant authority' },
      { ms: 'Sediakan wali, saksi, dan susunan tempat keluarga', en: 'Prepare wali, witnesses, and family seating' },
      { ms: 'Confirm butiran tok kadi atau jurunikah', en: 'Confirm tok kadi or officiant details' },
      { ms: 'Sediakan mas kahwin, cincin, dan hantaran', en: 'Prepare mas kahwin, rings, and hantaran items' },
      { ms: 'Confirm baju, makeup, dan timing photographer', en: 'Confirm attire, makeup, and photographer timing' },
      { ms: 'Sediakan plan photoshoot ringkas selepas nikah', en: 'Prepare a simple post-nikah photo session plan' }
    ]
  },
  {
    title: { ms: 'Timeline hari sanding', en: 'Sanding day timeline' },
    items: [
      { ms: 'Vendor sampai dan semak setup', en: 'Vendor arrival and setup check' },
      { ms: 'Persediaan makeup dan baju', en: 'Makeup and outfit preparation' },
      { ms: 'Sesi gambar keluarga', en: 'Family photo session' },
      { ms: 'Tetamu tiba dan reception bermula', en: 'Guest arrival and reception opening' },
      { ms: 'Pengantin masuk', en: 'Couple entrance' },
      { ms: 'Makan beradab dan table rounds', en: 'Meal service and table rounds' },
      { ms: 'Potong kek atau program khas', en: 'Cake cutting or special program' },
      { ms: 'Sesi fotografi akhir', en: 'Final photography session' },
      { ms: 'Vendor teardown dan serah barang', en: 'Vendor teardown and item handover' }
    ]
  },
  {
    title: { ms: 'Soalan meeting vendor', en: 'Vendor meeting questions' },
    items: [
      { ms: 'Adakah tarikh majlis kami masih available?', en: 'Are you available on our wedding date?' },
      { ms: 'Apa yang termasuk dalam pakej?', en: 'What is included in the package?' },
      { ms: 'Bagaimana jadual bayaran dan jumlah deposit?', en: 'What is the payment schedule and deposit amount?' },
      { ms: 'Ada caj overtime atau transport?', en: 'Are there overtime or transport fees?' },
      { ms: 'Siapa contact person pada hari majlis?', en: 'Who is the event-day contact person?' },
      { ms: 'Apa polisi cancellation atau postponement?', en: 'What is your cancellation or postponement policy?' },
      { ms: 'Boleh tengok portfolio terkini?', en: 'Can we see recent portfolio examples?' },
      { ms: 'Apa yang vendor perlukan sebelum hari majlis?', en: 'What do you need from us before the wedding day?' }
    ]
  },
  {
    title: { ms: 'Kategori bajet kahwin', en: 'Wedding budget categories' },
    items: [
      { ms: 'Venue atau dewan', en: 'Venue or hall' },
      { ms: 'Katering', en: 'Catering' },
      { ms: 'Dekorasi dan pelamin', en: 'Decor and pelamin' },
      { ms: 'Baju dan aksesori', en: 'Attire and accessories' },
      { ms: 'Makeup dan styling', en: 'Makeup and styling' },
      { ms: 'Fotografi dan videografi', en: 'Photography and videography' },
      { ms: 'Jemputan dan stationery', en: 'Invitation and stationery' },
      { ms: 'Hantaran dan hadiah', en: 'Hantaran and gifts' },
      { ms: 'Transport dan penginapan', en: 'Transport and accommodation' },
      { ms: 'Dana kecemasan', en: 'Contingency fund' }
    ]
  }
];
