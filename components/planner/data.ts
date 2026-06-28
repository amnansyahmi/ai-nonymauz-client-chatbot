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
  chatMigratedAt: 'majlismate.chatMigratedAt',
  workspaceMigratedAt: 'majlismate.workspaceMigratedAt',
  activeTab: 'majlismate.activeTab',
  checklistTitle: 'majlismate.checklistTitle',
  checklistItems: 'majlismate.checklistItems',
  checklistView: 'majlismate.checklistView',
  checklistFilter: 'majlismate.checklistFilter',
  checklistNewDraft: 'majlismate.checklistNewDraft',
  appointments: 'majlismate.appointments',
  calendarMonth: 'majlismate.calendarMonth',
  calendarView: 'majlismate.calendarView',
  calendarAgendaFilter: 'majlismate.calendarAgendaFilter',
  selectedDate: 'majlismate.selectedDate',
  plannerProfile: 'majlismate.plannerProfile',
  budgetItems: 'majlismate.budgetItems',
  budgetDraft: 'majlismate.budgetDraft',
  guests: 'majlismate.guests',
  guestDraft: 'majlismate.guestDraft',
  rsvpFormUrl: 'majlismate.rsvpFormUrl',
  savedVendors: 'majlismate.savedVendors',
  activity: 'majlismate.activity',
  language: 'majlismate.language'
};

export const defaultPlannerProfile: PlannerProfile = {
  coupleName: '',
  groomName: '',
  brideName: '',
  majlisDate: '',
  majlisTime: '',
  venueName: '',
  negeri: 'Selangor',
  totalBudget: 30000,
  guestTarget: 300,
  weddingStyle: '',
  keyContact: '',
  completed: false
};

// daysOffset = days before (-) or after (+) the wedding date to set as phase deadline
export const defaultChecklistTemplate = [
  {
    phase: { ms: '6-12 Bulan Sebelum', en: '6-12 Months Before' },
    daysOffset: 270,
    items: [
      { ms: 'Anggarkan jumlah tetamu & buat senarai kasar', en: 'Estimate guest count and draft a rough list' },
      { ms: 'Tetapkan bajet keseluruhan majlis', en: 'Set the overall wedding budget' },
      { ms: 'Rancang aturcara & format majlis', en: 'Plan the programme and majlis format' },
      { ms: 'Daftar & hadir kursus pra-perkahwinan', en: 'Register for and attend the pre-marriage course' },
      { ms: 'Survey & tempah lokasi / dewan majlis', en: 'Survey and book the wedding venue or hall' },
      { ms: 'Survey & tempah jurufoto & juruvideo', en: 'Survey and book photographer and videographer' },
      { ms: 'Bincang konsep & barang hantaran', en: 'Discuss hantaran concept and items' },
      { ms: 'Pilih & janji temu dengan katerer', en: 'Choose and set appointment with caterer' },
      { ms: 'Buka akaun tabungan khas untuk kahwin', en: 'Open a dedicated wedding savings account' }
    ]
  },
  {
    phase: { ms: '5 Bulan Sebelum', en: '5 Months Before' },
    daysOffset: 150,
    items: [
      { ms: 'Urus & siapkan dokumen permohonan nikah', en: 'Prepare and submit nikah application documents' },
      { ms: 'Tempah pengacara majlis / DJ / Audio System', en: 'Book emcee, DJ, and audio system' },
      { ms: 'Tetapkan konsep, tema & warna pelamin', en: 'Finalise pelamin concept, theme, and colour' },
      { ms: 'Tentukan tema / warna pakaian untuk keluarga', en: 'Decide family attire theme and colour' },
      { ms: 'Mula beli & kumpul barang hantaran', en: 'Start buying and collecting hantaran items' },
      { ms: 'Apply cuti hari majlis & sehari sebelum', en: 'Apply for leave on wedding day and day before' },
      { ms: 'Survey & tempah pakej / tiket bulan madu', en: 'Survey and book honeymoon package or tickets' },
      { ms: 'Booking penginapan untuk tetamu luar', en: 'Book accommodation for outstation guests' },
      { ms: 'Bincang & tentukan pelamin nikah', en: 'Discuss and decide on nikah pelamin' }
    ]
  },
  {
    phase: { ms: '2-3 Bulan Sebelum', en: '2-3 Months Before' },
    daysOffset: 75,
    items: [
      { ms: 'Buat ujian HIV di klinik atau hospital', en: 'Complete HIV test at clinic or hospital' },
      { ms: 'Serahkan semua dokumen di Pejabat Agama Islam', en: 'Submit all documents to the Islamic Affairs Office' },
      { ms: 'Semak & pastikan semua vendor dah confirm booking', en: 'Verify all vendor bookings are confirmed' },
      { ms: 'Sediakan senarai tugasan untuk ahli keluarga', en: 'Prepare task list for family members' },
      { ms: 'Pilih baju majlis & pergi ambil ukuran di butik', en: 'Choose wedding attire and take measurements at boutique' },
      { ms: 'Pilih pengapit & tentukan tema pakaian mereka', en: 'Choose bridesmaids/groomsmen and decide attire theme' },
      { ms: 'Buat food testing dengan caterer', en: 'Do food tasting session with caterer' },
      { ms: 'Confirm dekorasi pelamin & lawatan ke butik', en: 'Confirm pelamin decor and visit the boutique' },
      { ms: 'Tempah kad kahwin cetak & kad digital', en: 'Order printed and digital wedding invitations' },
      { ms: 'Uruskan bunga pahar, telur berinai & goodies tetamu', en: 'Arrange bunga pahar, henna eggs, and guest goodies' }
    ]
  },
  {
    phase: { ms: '1 Bulan Sebelum', en: '1 Month Before' },
    daysOffset: 30,
    items: [
      { ms: 'Semak status permohonan nikah di Pejabat Agama', en: 'Check nikah application status at Islamic Affairs Office' },
      { ms: 'Finalkan & hantar senarai tetamu', en: 'Finalise and send out guest list' },
      { ms: 'Pos kad kahwin & buka RSVP', en: 'Send out wedding cards and open RSVP' },
      { ms: 'Cuba solekan penuh dengan juruandam', en: 'Do full makeup trial with the makeup artist' },
      { ms: 'Rancang & finalkan susunan tempat duduk tetamu', en: 'Plan and finalise guest seating arrangement' },
      { ms: 'Buat rawatan spa, facial & jaga kulit', en: 'Do spa, facial, and skincare treatments' },
      { ms: 'Tempah & confirm juru ukir inai', en: 'Book and confirm henna artist' },
      { ms: 'Siapkan & gubah dekorasi hantaran', en: 'Prepare and arrange hantaran decorations' },
      { ms: 'Uruskan kereta pengantin & laluan konvoi', en: 'Arrange bridal car and convoy route' }
    ]
  },
  {
    phase: { ms: '1 Minggu Sebelum', en: '1 Week Before' },
    daysOffset: 7,
    items: [
      { ms: 'Sahkan kehadiran pendaftaran pernikahan', en: 'Confirm attendance at marriage registration' },
      { ms: 'Sediakan duit tunai untuk jurunikah, saksi & lain-lain', en: 'Prepare cash for nikah officiant, witnesses, and others' },
      { ms: 'Ambil baju kahwin di butik & cuba sekali lagi', en: 'Collect wedding attire from boutique and try on again' },
      { ms: 'Hias & siapkan bilik pengantin sepenuhnya', en: 'Decorate and fully prepare the bridal room' },
      { ms: 'Sahkan semua vendor — pelamin, caterer, DJ, kek, kompang', en: 'Confirm all vendors — pelamin, caterer, DJ, cake, kompang' },
      { ms: 'Bagi taklimat tugasan kepada keluarga & sahabat', en: 'Brief family members and helpers on their tasks' },
      { ms: 'Siapkan sampul bayaran untuk vendor hari majlis', en: 'Prepare payment envelopes for day-of vendors' }
    ]
  },
  {
    phase: { ms: 'Sehari Sebelum', en: 'Day Before' },
    daysOffset: 1,
    items: [
      { ms: 'Pastikan baju untuk majlis siap & dah iron', en: 'Ensure all outfits are ready and ironed' },
      { ms: 'Confirm sekali lagi dengan semua vendor', en: 'Do a final confirmation with all vendors' },
      { ms: 'Charge semua telefon, power bank & bateri kamera', en: 'Charge all phones, power banks, and camera batteries' },
      { ms: 'Kemas & pack beg pengantin untuk esok', en: 'Pack the bridal bag for the wedding day' },
      { ms: 'Pastikan semua penanda arah dah dipasang', en: 'Ensure all directional signs are installed' },
      { ms: 'Rehat dan tidur awal', en: 'Rest and sleep early' }
    ]
  },
  {
    phase: { ms: 'Selepas Kahwin', en: 'After Wedding' },
    daysOffset: -14,
    items: [
      { ms: 'Daftar & ambil sijil nikah di Pejabat Agama (dalam 7 hari)', en: 'Register and collect nikah certificate within 7 days' },
      { ms: 'Tukar nama & status di MyKad — JPN', en: 'Update name and marital status on MyKad at JPN' },
      { ms: 'Kemaskini maklumat di EPF / KWSP', en: 'Update information at EPF / KWSP' },
      { ms: 'Kemaskini polisi insurans & takaful', en: 'Update insurance and takaful policies' },
      { ms: 'Kemaskini maklumat di semua akaun bank', en: 'Update information at all bank accounts' },
      { ms: 'Pulangkan atau selesaikan baki bayaran semua vendor', en: 'Return items or settle remaining payments with all vendors' },
      { ms: 'Backup semua gambar & video dari photographer', en: 'Back up all photos and videos from photographer' }
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
