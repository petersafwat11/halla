// Static data for events and single event pages

// Main events page data
export const eventsStats = [
  {
    icon: '/svg/events/calendar.svg',
    value: 12,
    label: 'إجمالي المناسبات',
  },
  {
    icon: '/svg/events/calendar.svg',
    value: 1,
    label: 'المناسبات النشطة',
  },
  {
    icon: '/svg/events/calendar.svg',
    value: '92%',
    label: 'معدل الحضور',
    subLabel: 'متوسط الحاضرين',
  },
];

export const eventsTableData = [
  {
    id: 1,
    eventName: 'أحمد جمال سمر',
    eventType: 'حفل زفاف',
    attendance: 250,
    confirmed: 120,
    apologies: 18,
    noReply: 18,
    status: 'active',
  },
  {
    id: 2,
    eventName: 'أمير سامي',
    eventType: 'حفل زفاف',
    attendance: 250,
    confirmed: 120,
    apologies: 18,
    noReply: 18,
    status: 'ended',
  },
  {
    id: 3,
    eventName: 'يوناثان مينا',
    eventType: 'حفل زفاف',
    attendance: 250,
    confirmed: 120,
    apologies: 18,
    noReply: 18,
    status: 'pending',
  },
  {
    id: 4,
    eventName: 'يوناثان مينا',
    eventType: 'حفل زفاف',
    attendance: 250,
    confirmed: 120,
    apologies: 18,
    noReply: 18,
    status: 'ended',
  },
];

// Chart data for main events page
export const chartData = {
  labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو'],
  datasets: [
    {
      label: 'الحضور',
      data: [65, 59, 80, 81, 56, 55, 40],
      fill: false,
      borderColor: '#2ec4b6',
      tension: 0.4,
    },
    {
      label: 'الدعوات',
      data: [28, 48, 40, 19, 86, 27, 90],
      fill: false,
      borderColor: '#3a86ff',
      tension: 0.4,
    },
  ],
};

export const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
    },
    y: {
      grid: { display: false },
      beginAtZero: true,
    },
  },
};

// Single event page data
export const singleEventStats = [
  {
    label: 'في الانتظار',
    value: 26,
    color: '#F9FAFB',
    textColor: '#4B5563',
    icon: '/svg/events/clock.svg',
  },
  {
    label: 'ربما',
    value: 23,
    color: '#fff7e6',
    textColor: '#d38200',
    icon: '/svg/events/maybe.svg',
  },
  {
    label: 'اعتذار',
    value: 12,
    color: '#f9ebea',
    textColor: '#c0392b',
    icon: '/svg/events/close.svg',
  },
  {
    label: 'حضور',
    value: 89,
    color: '#eaf4ef',
    textColor: '#2a8c5b',
    icon: '/svg/events/right.svg',
  },
];

export const staff = [
  { name: 'أحمد كمال ابراهيم', phone: '966051967149', isMain: true },
  { name: 'أحمد كمال ابراهيم', phone: '966051967149', isMain: true },
];

export const guestData = [
  {
    name: 'أحمد كمال سمر',
    phone: '96651885',
    message: 'شكراً على الدعوة',
    reply: 'اعتذر',
    time: '2025-06-15 9:30',
  },
  {
    name: 'أمير سامي',
    phone: '96658988',
    message: 'سعيد بالحضور',
    reply: 'في الانتظار',
    time: '2025-06-15 9:30',
  },
  {
    name: 'يوناثان مينا',
    phone: '96659848',
    message: 'سأحضر بإذن الله',
    reply: 'حضور',
    time: '2025-06-15 9:30',
  },
];
