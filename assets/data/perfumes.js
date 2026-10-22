/**
 * VOLODIUM PARFUM - Catalog Database
 * Curated selection of iconic niche fragrances, signature aroma boxes, and secret boxes.
 */
const PERFUMES_DATA = [
  {
    id: "baccarat-540",
    brand: "Maison Francis Kurkdjian",
    name: "Baccarat Rouge 540 Extrait",
    subtitle: "Древесно-амбровый эталон роскоши",
    gender: "unisex",
    category: "perfume",
    notesFamily: "oriental",
    image: "assets/images/IMG_4802.jpg",
    badge: "Абсолютный Хит",
    prices: {
      "3ml": 1900,
      "5ml": 2900,
      "10ml": 5200,
      "bottle": 38500
    },
    bottleSize: "70 ml",
    pyramid: {
      top: ["Горький миндаль", "Красный шафран"],
      heart: ["Египетский жасмин Грандифлорум", "Виргинский кедр"],
      base: ["Серая амбра", "Древесный мускус", "Сухая древесина"]
    },
    metrics: {
      longevity: "18+ часов",
      longevityScore: 98,
      sillage: "Шлейф до 5 метров",
      sillageScore: 95,
      season: "Осень / Зима / Вечер",
      vibe: "Статусный, магнетический, густой"
    },
    description: "Легендарный парфюмерный манифест Франсиса Кюркджяна. Версия Extrait de Parfum звучит глубже, теплее и богаче классики: горьковатый миндаль сплетается с драгоценным шафраном, хрустальным жасмином и густой серой амброй."
  },
  {
    id: "ganymede",
    brand: "Marc-Antoine Barrois",
    name: "Ganymede",
    subtitle: "Минерально-замшевый космический футуризм",
    gender: "unisex",
    category: "perfume",
    notesFamily: "mineral",
    image: "assets/images/IMG_4805.jpg",
    badge: "Топ Комплиментов",
    prices: {
      "3ml": 1400,
      "5ml": 2100,
      "10ml": 3800,
      "bottle": 24900
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Итальянский мандарин", "Шафран"],
      heart: ["Китайский османтус", "Абсолют фиалки"],
      base: ["Акигалавуд (Akigalawood)", "Бессмертник", "Тонкая замша"]
    },
    metrics: {
      longevity: "24+ часа",
      longevityScore: 100,
      sillage: "Километровый шлейф",
      sillageScore: 99,
      season: "Всесезонный",
      vibe: "Авангардный, притягательный, чистый"
    },
    description: "Созданный гениальным Квентином Бишем, Ganymede стал главным парфюмерным феноменом десятилетия. Минеральные аккорды свежести, мягкая перчаточная замша и благородный древесный акигалавуд создают шлейф, который невозможно забыть."
  },
  {
    id: "lost-cherry",
    brand: "Tom Ford",
    name: "Lost Cherry",
    subtitle: "Пьянящая вишня в амаретто и ликере",
    gender: "women",
    category: "perfume",
    notesFamily: "gourmand",
    image: "assets/images/IMG_4806.jpg",
    badge: "Чувственный Соблазн",
    prices: {
      "3ml": 1800,
      "5ml": 2700,
      "10ml": 4900,
      "bottle": 36000
    },
    bottleSize: "50 ml",
    pyramid: {
      top: ["Черная вишня", "Вишневый ликер", "Горький миндаль"],
      heart: ["Вишневый сироп Griotte", "Турецкая роза", "Жасмин самбак"],
      base: ["Перуанский бальзам", "Бобы тонка", "Сандал", "Ветивер", "Кедр"]
    },
    metrics: {
      longevity: "10-12 часов",
      longevityScore: 88,
      sillage: "Соблазнительный шлейф",
      sillageScore: 90,
      season: "Осень / Зима / Свидания",
      vibe: "Сексуальный, десертный, пьянящий"
    },
    description: "Культовый аромат запретного удовольствия. Сочные спелые вишни, утопающие в вишневом ликере с миндальной горчинкой и согревающим послевкусием пряных бобов тонка."
  },
  {
    id: "angels-share",
    brand: "Kilian",
    name: "Angels' Share",
    subtitle: "Выдержанный коньяк, корица и пралине",
    gender: "unisex",
    category: "perfume",
    notesFamily: "gourmand",
    image: "assets/images/IMG_4807.jpg",
    badge: "Зимний Фаворит",
    prices: {
      "3ml": 1750,
      "5ml": 2600,
      "10ml": 4700,
      "bottle": 31500
    },
    bottleSize: "50 ml",
    pyramid: {
      top: ["Выдержанный французский коньяк"],
      heart: ["Корица", "Бобы тонка", "Дубовая древесина"],
      base: ["Пралине", "Мадагаскарская ваниль", "Сандал"]
    },
    metrics: {
      longevity: "14+ часов",
      longevityScore: 92,
      sillage: "Густой согревающий",
      sillageScore: 94,
      season: "Осень / Зима",
      vibe: "Уютный, богатый, согревающий"
    },
    description: "«Доля ангелов» — парфюмерная ода знаменитой династии Хеннесси. Аромат дубовой коньячной бочки, яблочного пирога с корицей, карамельного пралине и теплой ванили."
  },
  {
    id: "fleur-narcotique",
    brand: "Ex Nihilo",
    name: "Fleur Narcotique",
    subtitle: "Цветочный гипноз с сочными личи и пионом",
    gender: "women",
    category: "perfume",
    notesFamily: "floral",
    image: "assets/images/IMG_4804.jpg",
    badge: "Бестселлер",
    prices: {
      "3ml": 1650,
      "5ml": 2450,
      "10ml": 4400,
      "bottle": 29500
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Бергамот", "Личи", "Белый персик"],
      heart: ["Жасмин", "Пион", "Цветок апельсина (Флердоранж)"],
      base: ["Древесные ноты", "Дубовый мох", "Шелковистый мускус"]
    },
    metrics: {
      longevity: "12+ часов",
      longevityScore: 90,
      sillage: "Яркий летящий шлейф",
      sillageScore: 93,
      season: "Весна / Лето / Офис / Вечер",
      vibe: "Женственный, звонкий, комплиментарный"
    },
    description: "Наркотический цветок нового поколения. Взрыв сочного персика и экзотического личи, переходящий в охапку свежих пионов на прохладной мускусно-древесной базе."
  },
  {
    id: "tobacco-vanille",
    brand: "Tom Ford",
    name: "Tobacco Vanille",
    subtitle: "Английский трубочный табак и теплая ваниль",
    gender: "unisex",
    category: "perfume",
    notesFamily: "oriental",
    image: "assets/images/IMG_4808.jpg",
    badge: "Классика Ниши",
    prices: {
      "3ml": 1700,
      "5ml": 2550,
      "10ml": 4600,
      "bottle": 34000
    },
    bottleSize: "50 ml",
    pyramid: {
      top: ["Листья дорогого табака", "Пряные специи"],
      heart: ["Бобы тонка", "Цветок табака", "Ваниль", "Какао"],
      base: ["Древесный аккорд", "Сухофрукты"]
    },
    metrics: {
      longevity: "16+ часов",
      longevityScore: 96,
      sillage: "Плотный аристократичный",
      sillageScore: 95,
      season: "Осень / Зима",
      vibe: "Статусный, респектабельный, глубокий"
    },
    description: "Атмосфера закрытого лондонского джентльменского клуба. Бархатный дорогой табак, ароматные восточные пряности, натуральная бурбонская ваниль и вяленая вишня с сухофруктами."
  },
  {
    id: "creed-aventus",
    brand: "Creed",
    name: "Aventus",
    subtitle: "Икона мужского стиля и уверенности",
    gender: "men",
    category: "perfume",
    notesFamily: "woody",
    image: "assets/images/IMG_4805.jpg",
    badge: "Мужской Эталон",
    prices: {
      "3ml": 1850,
      "5ml": 2800,
      "10ml": 5100,
      "bottle": 39000
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Королевский ананас", "Бергамот", "Черная смородина", "Зеленое яблоко"],
      heart: ["Березовый деготь", "Пачули", "Марокканский жасмин", "Роза"],
      base: ["Мускус", "Дубовый мох", "Серая амбра", "Ваниль"]
    },
    metrics: {
      longevity: "12+ часов",
      longevityScore: 90,
      sillage: "Мужественный благородный",
      sillageScore: 94,
      season: "Всесезонный",
      vibe: "Победоносный, свежий, харизматичный"
    },
    description: "Величайший мужской аромат современности. Искристая фруктовая свежесть ананаса и смородины плавно переходит в дымный березовый шлейф с дорогой серой амброй."
  },
  {
    id: "byredo-blanche",
    brand: "Byredo",
    name: "Blanche",
    subtitle: "Идеальная чистота выстиранной белой рубашки",
    gender: "women",
    category: "perfume",
    notesFamily: "fresh",
    image: "assets/images/IMG_4804.jpg",
    badge: "Эстетика Чистоты",
    prices: {
      "3ml": 1350,
      "5ml": 1950,
      "10ml": 3600,
      "bottle": 23500
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Белая роза", "Розовый перец", "Альдегиды"],
      heart: ["Фиалка", "Нероли", "Пион"],
      base: ["Светлая древесина", "Сандал", "Мускус"]
    },
    metrics: {
      longevity: "8-10 часов",
      longevityScore: 82,
      sillage: "Нежный деликатный",
      sillageScore: 80,
      season: "Весна / Лето / На каждый день",
      vibe: "Свежий, хрустальный, минималистичный"
    },
    description: "Посвящение невинности и свежести. Ощущение только что выглаженной хлопковой рубашки, чистого утреннего воздуха и прозрачных розовых лепестков."
  },
  {
    id: "amouage-guidance",
    brand: "Amouage",
    name: "Guidance",
    subtitle: "Сливочная груша, фундук, ладан и османтус",
    gender: "women",
    category: "perfume",
    notesFamily: "floral",
    image: "assets/images/IMG_4806.jpg",
    badge: "Главный Тренд 2026",
    prices: {
      "3ml": 1900,
      "5ml": 2850,
      "10ml": 5300,
      "bottle": 35500
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Груша", "Ладан (Олибанум)", "Лесной орех (Фундук)"],
      heart: ["Османтус", "Дамасская роза", "Шафран", "Жасмин самбак"],
      base: ["Сандал", "Ваниль", "Акигалавуд", "Серая амбра", "Лабданум"]
    },
    metrics: {
      longevity: "24+ часа",
      longevityScore: 100,
      sillage: "Невероятный шлейф 10/10",
      sillageScore: 100,
      season: "Всесезонный",
      vibe: "Женственный, роскошный, гипнотический"
    },
    description: "Знаковая работа парфюмера Квентина Биша для дома Amouage. Сливочная тающая груша с лесным орехом, бархатным пудровым османтусом и многочасовой стойкостью."
  },
  {
    id: "initio-oud-for-greatness",
    brand: "Initio Parfums Prives",
    name: "Oud for Greatness",
    subtitle: "Мистический уд, лаванда и драгоценный шафран",
    gender: "unisex",
    category: "perfume",
    notesFamily: "woody",
    image: "assets/images/IMG_4808.jpg",
    badge: "Черное Золото",
    prices: {
      "3ml": 1950,
      "5ml": 2950,
      "10ml": 5400,
      "bottle": 37000
    },
    bottleSize: "90 ml",
    pyramid: {
      top: ["Лаванда", "Шафран", "Мускатный орех"],
      heart: ["Натуральный Уд (Агаровое дерево)"],
      base: ["Пачули", "Мускус"]
    },
    metrics: {
      longevity: "20+ часов",
      longevityScore: 98,
      sillage: "Гипнотический магнетический",
      sillageScore: 97,
      season: "Осень / Зима / Вечер",
      vibe: "Мощный, мистический, статусный"
    },
    description: "Аромат священной геометрии и абсолютной уверенности. Чистейший натуральный уд высочайшего качества в обрамлении свежей лаванды и теплого шафрана."
  },
  {
    id: "xerjoff-naxos",
    brand: "Xerjoff",
    name: "Naxos 1861",
    subtitle: "Дикий сицилийский мед, лаванда и табак",
    gender: "unisex",
    category: "perfume",
    notesFamily: "oriental",
    image: "assets/images/IMG_4807.jpg",
    badge: "Итальянское Солнце",
    prices: {
      "3ml": 1600,
      "5ml": 2350,
      "10ml": 4300,
      "bottle": 27500
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Бергамот", "Лимон", "Лаванда"],
      heart: ["Дикий мед", "Корица", "Кашмеран", "Жасмин самбак"],
      base: ["Листья табака", "Бобы тонка", "Ваниль"]
    },
    metrics: {
      longevity: "16+ часов",
      longevityScore: 95,
      sillage: "Широкий пряный шлейф",
      sillageScore: 94,
      season: "Осень / Зима / Весна",
      vibe: "Теплый, богатый, средиземноморский"
    },
    description: "Ода Сицилии и итальянской страсти. Пронзительная цитрусовая свежесть перетекает в густой золотой мед, лаванду и благородный табачный лист с ванилью."
  },
  {
    id: "byredo-bal-dafrique",
    brand: "Byredo",
    name: "Bal d'Afrique",
    subtitle: "Солнечные бархатцы, ветивер и парижский шик",
    gender: "unisex",
    category: "perfume",
    notesFamily: "fresh",
    image: "assets/images/IMG_4802.jpg",
    badge: "Любимец Публики",
    prices: {
      "3ml": 1400,
      "5ml": 2100,
      "10ml": 3800,
      "bottle": 24000
    },
    bottleSize: "100 ml",
    pyramid: {
      top: ["Бергамот", "Лимон", "Нероли", "Африканские бархатцы"],
      heart: ["Фиалка", "Жасмин", "Цикламен"],
      base: ["Черная амбра", "Мускус", "Ветивер", "Марокканский кедр"]
    },
    metrics: {
      longevity: "8-10 часов",
      longevityScore: 84,
      sillage: "Мягкий обволакивающий",
      sillageScore: 86,
      season: "Весна / Лето / Осень",
      vibe: "Солнечный, радостный, комфортный"
    },
    description: "Париж 1920-х и увлечение африканской культурой. Теплый сливочный ветивер, украшенный бархатцами, нероли и нежной фиалковой пудрой."
  }
];

const AROMA_BOXES_DATA = [
  {
    id: "box-compliments",
    name: "Аромабокс «Топ Комплиментов»",
    subtitle: "5 главных мировых бестселлеров в одном сете",
    category: "box",
    badge: "Хит Продаж #1",
    image: "assets/images/IMG_4620.PNG",
    items: [
      "Marc-Antoine Barrois — Ganymede",
      "Maison Francis Kurkdjian — Baccarat Rouge 540",
      "Tom Ford — Lost Cherry",
      "Ex Nihilo — Fleur Narcotique",
      "Kilian — Angels' Share"
    ],
    prices: {
      "3ml": 6900,
      "5ml": 9900
    },
    description: "Набор, гарантирующий максимальное количество вопросов «Чем от вас так невероятно пахнет?». Пять самых комплиментарных ароматов нишевой индустрии."
  },
  {
    id: "box-cleanliness",
    name: "Аромабокс «Чистота и Белая Рубашка»",
    subtitle: "Кристальная свежесть, хрустальный мускус и утренний воздух",
    category: "box",
    badge: "Офисный Идеал",
    image: "assets/images/IMG_4626.PNG",
    items: [
      "Byredo — Blanche",
      "Byredo — Bal d'Afrique",
      "Creed — Silver Mountain Water",
      "Escentric Molecules — Molecule 01",
      "Zarkoperfume — The Muse"
    ],
    prices: {
      "3ml": 5900,
      "5ml": 8500
    },
    description: "Идеален для любителей ненавязчивого, элегантного и чистого звучания. Запах выстиранного хлопка, морского бриза и невесомой пудры."
  },
  {
    id: "box-woody-leather",
    name: "Аромабокс «Древесный & Кожаный Шик»",
    subtitle: "Статусные, плотные и мужественные композиции",
    category: "box",
    badge: "Мужской Выбор",
    image: "assets/images/IMG_4625.PNG",
    items: [
      "Initio — Oud for Greatness",
      "Tom Ford — Tobacco Vanille",
      "Marc-Antoine Barrois — Ganymede",
      "Xerjoff — Naxos",
      "Kilian — Black Phantom"
    ],
    prices: {
      "3ml": 7200,
      "5ml": 10500
    },
    description: "Глубокие древесные аккорды, дорогая перчаточная кожа, выдержанный табак и согревающий пряный алкоголь. Премиальный выбор уверенного человека."
  },
  {
    id: "box-gourmand",
    name: "Аромабокс «Гурманский Соблазн»",
    subtitle: "Ликерная вишня, коньячное пралине и пряный шоколад",
    category: "box",
    badge: "Сладостный Восторг",
    image: "assets/images/IMG_4623.PNG",
    items: [
      "Tom Ford — Lost Cherry",
      "Kilian — Angels' Share",
      "Tom Ford — Tobacco Vanille",
      "Xerjoff — Italica",
      "Lattafa — Khamrah"
    ],
    prices: {
      "3ml": 6500,
      "5ml": 9400
    },
    description: "Соблазнительные ароматы, которые хочется попробовать на вкус. Идеальный спутник для прохладных вечеров, романтических свиданий и уютных встреч."
  }
];

const SECRET_BOXES_DATA = [
  {
    id: "secret-explorer",
    level: "Исследователь",
    subtitle: "3 уникальных аромата по 5 мл под ваш характер",
    price: 3900,
    oldPrice: 4800,
    volumeInfo: "3 флакона по 5 мл (хватит на 2-3 месяца)",
    badge: "Легкий Старт",
    image: "assets/images/IMG_5711.png",
    description: "Для тех, кто готов открыть для себя мир нишевой парфюмерии и выйти за рамки привычного люкса. Состав бокса собирается персонально под ваши предпочтения и остается тайной до момента вскрытия посылки!",
    features: [
      "3 селективных аромата по 5 мл",
      "Индивидуальный подбор Владимиром Вациком",
      "Персональная карточка с описанием нот",
      "Стильная фирменная подарочная упаковка"
    ]
  },
  {
    id: "secret-collector",
    level: "Коллекционер",
    subtitle: "5 редких ароматов по 5 мл + персональная карта стиля",
    price: 5900,
    oldPrice: 7200,
    volumeInfo: "5 флаконов по 5 мл (полноценный гардероб)",
    badge: "Безусловный Хит",
    isHit: true,
    image: "assets/images/6650DBD3-2C0C-4C01-A.png",
    description: "Самый любимый выбор наших клиентов. Пять редких композиций, подобранных под ваш темперамент, стиль одежды и настроение. Идеальный баланс на каждый день и на вечер.",
    features: [
      "5 нишевых ароматов по 5 мл",
      "Гардероб на все сезоны и поводы",
      "Подробная расшифровка пирамид и советы по нанесению",
      "Премиальная подарочная коробка с шелковым ложементом"
    ]
  },
  {
    id: "secret-connoisseur",
    level: "Ценитель (VIP)",
    subtitle: "5 эксклюзивных ароматов по 10 мл + тайный подарок",
    price: 9900,
    oldPrice: 12500,
    volumeInfo: "5 флаконов по 10 мл + секретный подарок",
    badge: "Максимальный сет",
    image: "assets/images/IMG_5711.png",
    description: "Расширенный сет: 5 нишевых ароматов по 10 мл в стеклянных атомайзерах плюс секретный парфюмерный презент от Владимира.",
    features: [
      "5 эксклюзивных ароматов по 10 мл",
      "Секретный подарок от Владимира в каждом боксе",
      "Персональная видео-рекомендация или аудио-гид",
      "Бесплатная экспресс-доставка СДЭК до двери"
    ]
  }
];

const CERTIFICATES_DATA = [
  { id: "cert-3000", amount: 3000, title: "Знакомство с нишей", desc: "Идеально для заказа аромабокса или нескольких отливантов" },
  { id: "cert-5000", amount: 5000, title: "Парфюмерный выбор", desc: "Хит подарков: Secret Box или 3-4 премиальных отливанта" },
  { id: "cert-10000", amount: 10000, title: "Персональный гардероб", desc: "VIP-набор или консультация с Владимиром + бокс" },
  { id: "cert-15000", amount: 15000, title: "Премиум коллекция", desc: "Большой выбор селектива или полноценный запечатанный флакон" },
  { id: "cert-20000", amount: 20000, title: "Полный гардероб", desc: "Абсолютная свобода выбора любого парфюмерного сета или флакона" }
];
