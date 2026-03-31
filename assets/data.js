(function () {
  const STORAGE_KEY = "busan-trip-collab-store-v3";

  const placeCatalog = {
    "海雲台": {
      area: "Haeundae",
      businessHours: "全天開放，周邊店家多為 10:00 - 22:00",
      caution: "海邊晚間風大，建議多帶一件薄外套。",
      transit: "釜山地鐵 2 號線海雲台站步行約 10 分鐘。",
      travelMinutes: 35,
      mapUrl: "https://map.naver.com/p/search/%ED%95%B4%EC%9A%B4%EB%8C%80",
      tags: ["海景", "散步", "咖啡廳"]
    },
    "廣安里": {
      area: "Suyeong",
      businessHours: "全天開放，周邊餐廳多為 11:00 - 24:00",
      caution: "看廣安大橋夜景很熱門，想坐海景餐廳建議先訂位。",
      transit: "釜山地鐵 2 號線廣安站步行約 12 分鐘。",
      travelMinutes: 30,
      mapUrl: "https://map.naver.com/p/search/%EA%B4%91%EC%95%88%EB%A6%AC",
      tags: ["夜景", "海景", "美食"]
    },
    "甘川文化村": {
      area: "Saha",
      businessHours: "09:00 - 18:00",
      caution: "坡道多、樓梯多，請穿好走的鞋。",
      transit: "地鐵加公車或小巴，總計約 40 分鐘。",
      travelMinutes: 40,
      mapUrl: "https://map.naver.com/p/search/%EA%B0%90%EC%B2%9C%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84",
      tags: ["彩色村", "拍照", "散步"]
    },
    "札嘎其市場": {
      area: "Jung",
      businessHours: "07:00 - 22:00",
      caution: "海鮮價位建議先確認，避免超出預算。",
      transit: "地鐵 1 號線札嘎其站步行約 5 分鐘。",
      travelMinutes: 22,
      mapUrl: "https://map.naver.com/p/search/%EC%9E%90%EA%B0%88%EC%B9%98%EC%8B%9C%EC%9E%A5",
      tags: ["海鮮", "市場", "在地體驗"]
    },
    "南浦洞": {
      area: "Jung",
      businessHours: "10:30 - 22:00",
      caution: "商圈和市場連在一起，很容易逛超時。",
      transit: "地鐵 1 號線南浦站直達。",
      travelMinutes: 20,
      mapUrl: "https://map.naver.com/p/search/%EB%82%A8%ED%8F%AC%EB%8F%99",
      tags: ["購物", "小吃", "逛街"]
    },
    "松島海上纜車": {
      area: "Seo",
      businessHours: "09:00 - 20:00",
      caution: "天氣不佳可能停駛，建議當日再次確認。",
      transit: "從南浦洞搭巴士或計程車過去較順。",
      travelMinutes: 28,
      mapUrl: "https://map.naver.com/p/search/%EC%86%A1%EB%8F%84%ED%95%B4%EC%83%81%EC%BC%80%EC%9D%B4%EB%B8%94%EC%B9%B4",
      tags: ["纜車", "海景", "觀景"]
    },
    "釜山塔": {
      area: "Jung",
      businessHours: "10:00 - 22:00",
      caution: "晚上熱門時段人較多，建議先上塔再吃晚餐。",
      transit: "由南浦洞步行到龍頭山公園後可搭電梯上塔。",
      travelMinutes: 18,
      mapUrl: "https://map.naver.com/p/search/%EB%B6%80%EC%82%B0%ED%83%80%EC%9B%8C",
      tags: ["夜景", "觀景", "地標"]
    },
    "西面": {
      area: "Busanjin",
      businessHours: "10:30 - 23:00",
      caution: "商圈很大，建議先決定主攻購物還是美食。",
      transit: "釜山地鐵 1、2 號線西面站直達。",
      travelMinutes: 25,
      mapUrl: "https://map.naver.com/p/search/%EC%84%9C%EB%A9%B4",
      tags: ["購物", "美食", "商圈"]
    },
    "白淺灘文化村": {
      area: "Yeongdo",
      businessHours: "全天開放，店家多為 11:00 - 20:00",
      caution: "階梯與坡道多，若有長輩同行需預留更多時間。",
      transit: "從南浦洞搭公車或計程車約 25 分鐘。",
      travelMinutes: 25,
      mapUrl: "https://map.naver.com/p/search/%ED%9D%B0%EC%97%AC%EC%9A%B8%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84",
      tags: ["海景", "拍照", "散步"]
    }
  };

  const transportCatalog = {
    "機場巴士": { details: "搭機場巴士前往市區飯店", duration: 60 },
    "地鐵": { details: "搭釜山地鐵 이동", duration: 30 },
    "公車": { details: "搭公車 이동", duration: 35 },
    "計程車": { details: "搭計程車 이동", duration: 25 },
    "步行": { details: "步行移動", duration: 15 }
  };

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function formatDateLabel(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}(${weekdays[date.getDay()]})`;
  }

  function addDays(dateString, offset) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + offset);
    return date.toISOString().slice(0, 10);
  }

  function enrichPlace(place) {
    return (
      placeCatalog[place] || {
        area: "Busan",
        businessHours: "請接正式地圖 / 店家 API 查詢",
        caution: "尚未接即時資料，請人工確認營業時間與休館日。",
        transit: "尚未接路線 API，建議接 NAVER Map / Google Maps。",
        travelMinutes: 25,
        mapUrl: `https://map.naver.com/p/search/${encodeURIComponent(place)}`,
        tags: ["待補資料"]
      }
    );
  }

  function createActivityBlock(base) {
    const details = enrichPlace(base.place);
    return {
      id: base.id || uid("block"),
      type: "activity",
      place: base.place,
      title: base.title || base.place,
      startTime: base.startTime || "10:00",
      endTime: base.endTime || "11:30",
      notes: base.notes || "",
      businessHours: details.businessHours,
      caution: details.caution,
      transit: details.transit,
      travelMinutes: details.travelMinutes,
      mapUrl: details.mapUrl,
      tags: details.tags,
      area: details.area
    };
  }

  function createTransportBlock(base) {
    const details = transportCatalog[base.transportMode] || {
      details: base.notes || "請補上交通方式",
      duration: 30
    };
    return {
      id: base.id || uid("block"),
      type: "transport",
      title: base.title || `${base.from || "上一站"} -> ${base.to || "下一站"}`,
      startTime: base.startTime || "11:30",
      endTime: base.endTime || "12:00",
      notes: base.notes || details.details,
      transportMode: base.transportMode || "地鐵",
      from: base.from || "",
      to: base.to || "",
      durationMinutes: base.durationMinutes || details.duration,
      caution: base.caution || "請預留轉乘與等車時間。"
    };
  }

  function createFlightBlock(base) {
    return {
      id: base.id || uid("block"),
      type: "flight",
      title: base.title || `${base.travelerName} 航班`,
      startTime: base.startTime || "09:00",
      endTime: base.endTime || "12:00",
      travelerName: base.travelerName || "旅客",
      flightNumber: base.flightNumber || "",
      route: base.route || "",
      terminal: base.terminal || "",
      notes: base.notes || "",
      caution: base.caution || "請提早 2 小時到機場並確認行李與報到時間。"
    };
  }

  function createBlock(base) {
    if (base.type === "transport") {
      return createTransportBlock(base);
    }
    if (base.type === "flight") {
      return createFlightBlock(base);
    }
    return createActivityBlock(base);
  }

  function createDefaultPlanner() {
    const startDate = "2026-04-26";
    return {
      title: "釜山 4 天 3 夜自由行",
      city: "韓國釜山",
      startDate,
      endDate: "2026-04-29",
      generalNotes: "4/29 晚上回台灣，最後一天需保留前往機場與退稅時間；朋友 B 於第二天中途加入。",
      flights: {
        outbound: "4/26(日) 台北 -> 釜山 BX794 09:05 - 12:25",
        inbound: "4/29(三) 釜山 -> 台北 CI189 20:35 - 22:00",
        friendJoin: "4/27(一) 台北 -> 釜山 LJ082 13:10 - 16:30"
      },
      apiConfig: {
        geminiBaseUrl: "/api/ai/itinerary-check",
        naverMapBaseUrl: "/api/naver/route",
        flightBaseUrl: "/api/flights/search",
        aiModel: "gemini-2.5-flash"
      },
      days: [
        {
          id: "day-1",
          date: startDate,
          label: `Day 1 | ${formatDateLabel(startDate)}`,
          blocks: [
            createFlightBlock({
              title: "主團出發航班",
              travelerName: "主團",
              startTime: "09:05",
              endTime: "12:25",
              flightNumber: "BX794",
              route: "TPE -> PUS",
              terminal: "釜山金海機場",
              notes: "抵達後準備入境與領行李"
            }),
            createTransportBlock({
              title: "機場 -> 西面飯店",
              startTime: "12:40",
              endTime: "13:50",
              transportMode: "機場巴士",
              from: "金海機場",
              to: "西面",
              durationMinutes: 70,
              notes: "可依實際情況改成輕軌 + 地鐵"
            }),
            createActivityBlock({ place: "西面", title: "西面商圈吃午餐 + 逛街", startTime: "14:30", endTime: "17:00" }),
            createTransportBlock({
              title: "西面 -> 廣安里",
              startTime: "17:00",
              endTime: "17:50",
              transportMode: "地鐵",
              from: "西面",
              to: "廣安里",
              durationMinutes: 50
            }),
            createActivityBlock({ place: "廣安里", title: "廣安里海邊散步與晚餐", startTime: "18:30", endTime: "21:00" })
          ]
        },
        {
          id: "day-2",
          date: addDays(startDate, 1),
          label: `Day 2 | ${formatDateLabel(addDays(startDate, 1))}`,
          blocks: [
            createActivityBlock({ place: "海雲台", title: "海雲台海邊散步 + 早午餐", startTime: "10:00", endTime: "13:00" }),
            createTransportBlock({
              title: "海雲台 -> 金海機場接朋友",
              startTime: "13:00",
              endTime: "14:00",
              transportMode: "地鐵",
              from: "海雲台",
              to: "金海機場",
              durationMinutes: 60,
              notes: "接第二天加入的朋友"
            }),
            createFlightBlock({
              title: "朋友 B 抵達釜山",
              travelerName: "朋友 B",
              startTime: "13:10",
              endTime: "16:30",
              flightNumber: "LJ082",
              route: "TPE -> PUS",
              terminal: "釜山金海機場",
              notes: "朋友 B 第二天中途加入"
            }),
            createTransportBlock({
              title: "機場 -> 廣安里會合",
              startTime: "16:40",
              endTime: "17:30",
              transportMode: "計程車",
              from: "金海機場",
              to: "廣安里",
              durationMinutes: 50
            }),
            createActivityBlock({ place: "廣安里", title: "咖啡廳休息後看夜景", startTime: "17:30", endTime: "20:30" })
          ]
        },
        {
          id: "day-3",
          date: addDays(startDate, 2),
          label: `Day 3 | ${formatDateLabel(addDays(startDate, 2))}`,
          blocks: [
            createActivityBlock({ place: "甘川文化村", title: "甘川文化村拍照", startTime: "10:00", endTime: "12:30" }),
            createTransportBlock({
              title: "甘川文化村 -> 札嘎其市場",
              startTime: "12:30",
              endTime: "13:20",
              transportMode: "公車",
              from: "甘川文化村",
              to: "札嘎其市場",
              durationMinutes: 50
            }),
            createActivityBlock({ place: "札嘎其市場", title: "札嘎其市場吃海鮮", startTime: "13:30", endTime: "15:00" }),
            createTransportBlock({
              title: "札嘎其市場 -> 松島海上纜車",
              startTime: "15:00",
              endTime: "15:40",
              transportMode: "計程車",
              from: "札嘎其市場",
              to: "松島海上纜車",
              durationMinutes: 40
            }),
            createActivityBlock({ place: "松島海上纜車", title: "松島海上纜車看海景", startTime: "16:00", endTime: "18:00" })
          ]
        },
        {
          id: "day-4",
          date: addDays(startDate, 3),
          label: `Day 4 | ${formatDateLabel(addDays(startDate, 3))}`,
          blocks: [
            createActivityBlock({ place: "南浦洞", title: "南浦洞最後購物", startTime: "10:30", endTime: "14:00" }),
            createTransportBlock({
              title: "南浦洞 -> 釜山塔",
              startTime: "14:00",
              endTime: "14:20",
              transportMode: "步行",
              from: "南浦洞",
              to: "釜山塔",
              durationMinutes: 20
            }),
            createActivityBlock({ place: "釜山塔", title: "釜山塔收尾看景", startTime: "14:30", endTime: "16:00" }),
            createTransportBlock({
              title: "市區 -> 金海機場",
              startTime: "16:10",
              endTime: "17:20",
              transportMode: "機場巴士",
              from: "南浦洞",
              to: "金海機場",
              durationMinutes: 70
            }),
            createFlightBlock({
              title: "返台航班",
              travelerName: "全員",
              startTime: "20:35",
              endTime: "22:00",
              flightNumber: "CI189",
              route: "PUS -> TPE",
              terminal: "釜山金海機場",
              notes: "傍晚前完成退稅與報到"
            })
          ]
        }
      ]
    };
  }

  function createDefaultGuides() {
    return {
      hotels: [
        {
          id: uid("hotel-area"),
          area: "海雲台",
          intro: "適合第一次去釜山、喜歡海景與高機能交通的人。",
          hotels: [
            { id: uid("hotel"), name: "釜山朝昕經典飯店", stars: "5 星", summary: "海景視野強，附泳池與三溫暖，適合想住得完整一點。" },
            { id: uid("hotel"), name: "L7 海雲台", stars: "4 星", summary: "位置方便、海景房口碑不錯，整體服務穩定。" },
            { id: uid("hotel"), name: "柯榮海雲飯店", stars: "4 星", summary: "房況乾淨，早餐與服務都偏穩定。" },
            { id: uid("hotel"), name: "UH Suite 海雲台飯店", stars: "3 星", summary: "預算友善，整體舒適度和 CP 值都不錯。" }
          ]
        },
        {
          id: uid("hotel-area"),
          area: "廣安里",
          intro: "想看廣安大橋夜景、找海景咖啡廳與晚餐的人很適合住這區。",
          hotels: [
            { id: uid("hotel"), name: "廣安裡凱星頓肯特飯店", stars: "4 星", summary: "高樓層景觀亮眼，整體住宿體驗偏輕鬆。" },
            { id: uid("hotel"), name: "霍默斯飯店", stars: "4 星", summary: "離海邊近，海景與交通便利度都不錯。" },
            { id: uid("hotel"), name: "水上皇宮大飯店", stars: "4 星", summary: "經典海景系選擇，位置和服務評價都穩。" },
            { id: uid("hotel"), name: "HyoiStay 廣安", stars: "3 星", summary: "預算型住宿，適合重視價格與地點的人。" }
          ]
        },
        {
          id: uid("hotel-area"),
          area: "西面",
          intro: "逛街、吃飯、轉乘方便，是最適合當通勤據點的區域。",
          hotels: [
            { id: uid("hotel"), name: "釜山樂天飯店", stars: "5 星", summary: "飯店設施完整，適合想住得舒適又有機能的人。" },
            { id: uid("hotel"), name: "釜山商務飯店", stars: "3 星", summary: "交通方便，房間尺寸與整潔度表現穩定。" },
            { id: uid("hotel"), name: "西面棕色點點商務飯店", stars: "3 星", summary: "房間寬敞、附浴缸，實用度高。" },
            { id: uid("hotel"), name: "釜山西面皇后飯店", stars: "3 星", summary: "高 CP 值，設備偏生活型，適合長一點的停留。" }
          ]
        },
        {
          id: uid("hotel-area"),
          area: "南浦洞",
          intro: "靠近札嘎其市場、BIFF 廣場與購物熱區，適合排老城區行程。",
          hotels: [
            { id: uid("hotel"), name: "釜山斯坦福飯店", stars: "4 星", summary: "房況乾淨，浴缸與地點都是優勢。" },
            { id: uid("hotel"), name: "弗萊特普瑞米爾南浦飯店", stars: "4 星", summary: "整潔度好，大廳設施加分，住起來輕鬆。" },
            { id: uid("hotel"), name: "格里芬灣飯店", stars: "4 星", summary: "景觀與整體舒適度都不錯，服務也穩。" },
            { id: uid("hotel"), name: "都市精品南浦 BIFF 飯店", stars: "3 星", summary: "高 CP 值，地點好，生活機能完整。" }
          ]
        }
      ],
      tickets: [
        { id: uid("ticket"), name: "釜山通行證 Busan Pass", pass: "核心票券", summary: "適合把展望台、纜車、汗蒸幕等景點集中玩的行程。" },
        { id: uid("ticket"), name: "樂天世界 Busan", pass: "Busan Pass 可評估", summary: "適合排半天到一天，樂園系行程很吃體力。" },
        { id: uid("ticket"), name: "Skyline Luge 斜坡滑車", pass: "Busan Pass 可評估", summary: "偏體驗型票券，適合和海景行程排在一起。" },
        { id: uid("ticket"), name: "釜山 X the Sky 展望台", pass: "Busan Pass 可評估", summary: "天氣好時很值得，建議配海雲台一帶行程。" },
        { id: uid("ticket"), name: "新世界 Spa Land", pass: "Busan Pass 可評估", summary: "想排輕鬆休息日很適合。" },
        { id: uid("ticket"), name: "松島海上纜車", pass: "Busan Pass 可評估", summary: "可和松島、南浦洞、甘川文化村同天搭配。" },
        { id: uid("ticket"), name: "Running Man 體驗館", pass: "Busan Pass 可評估", summary: "偏互動體驗，適合朋友一起玩。" },
        { id: uid("ticket"), name: "釜山塔", pass: "Busan Pass 可評估", summary: "可和南浦洞、BIFF、札嘎其同天安排。" }
      ],
      connectivity: [
        {
          id: uid("conn-category"),
          category: "通訊",
          items: [
            { id: uid("conn-item"), name: "eSIM", summary: "最省時間，落地後直接開通，適合手機支援 eSIM 的旅伴。" },
            { id: uid("conn-item"), name: "實體 SIM 卡", summary: "相容性高，適合不確定 eSIM 是否支援的人。" },
            { id: uid("conn-item"), name: "Wi-Fi 分享器", summary: "多人共用最省，但要記得充電與攜帶。" }
          ]
        },
        {
          id: uid("conn-category"),
          category: "市區交通",
          items: [
            { id: uid("conn-item"), name: "T-money / Cashbee", summary: "地鐵、公車最常用，建議第一天就先準備好。" },
            { id: uid("conn-item"), name: "地鐵", summary: "跨區移動穩定，適合西面、海雲台、廣安里、南浦洞主線。" },
            { id: uid("conn-item"), name: "公車", summary: "對甘川文化村、白淺灘文化村等景點很重要。" },
            { id: uid("conn-item"), name: "計程車", summary: "多人分攤很方便，夜間或轉乘太麻煩時特別實用。" }
          ]
        },
        {
          id: uid("conn-category"),
          category: "機場交通",
          items: [
            { id: uid("conn-item"), name: "金海機場輕軌 + 地鐵", summary: "價格穩，適合住在西面或地鐵沿線。" },
            { id: uid("conn-item"), name: "機場巴士", summary: "帶大行李比較省力，但要看住宿地點是否順路。" },
            { id: uid("conn-item"), name: "機場計程車", summary: "多人或晚到時最直覺，但費用較高。" }
          ]
        }
      ],
      mapEmbed: '<iframe src="https://www.google.com/maps/d/u/0/embed?mid=1r0iq5CuEG-mLo5MeLg355FM4IHnpAf4&ehbc=2E312F" width="640" height="480"></iframe>'
    };
  }

  function createSeedData() {
    return {
      planner: createDefaultPlanner(),
      guides: createDefaultGuides(),
      feedbackSubmissions: []
    };
  }

  function getStore() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.guides) {
        parsed.guides = createDefaultGuides();
        saveStore(parsed);
      }
      return parsed;
    } catch (error) {
      const seed = createSeedData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function sortByStartTime(left, right) {
    return left.startTime.localeCompare(right.startTime);
  }

  function updatePlanner(updater) {
    const store = getStore();
    store.planner = typeof updater === "function" ? updater(store.planner) : { ...store.planner, ...updater };
    saveStore(store);
    return store.planner;
  }

  function savePlannerMeta(meta) {
    return updatePlanner((planner) => ({
      ...planner,
      title: meta.title,
      city: meta.city,
      startDate: meta.startDate,
      endDate: meta.endDate,
      generalNotes: meta.generalNotes,
      flights: {
        outbound: meta.outboundFlight,
        inbound: meta.inboundFlight,
        friendJoin: meta.friendJoinFlight
      },
      apiConfig: {
        geminiBaseUrl: meta.geminiBaseUrl,
        naverMapBaseUrl: meta.naverMapBaseUrl,
        flightBaseUrl: meta.flightBaseUrl,
        aiModel: meta.aiModel
      },
      days: planner.days.map((day, index) => {
        const date = addDays(meta.startDate, index);
        return {
          ...day,
          date,
          label: `Day ${index + 1} | ${formatDateLabel(date)}`
        };
      })
    }));
  }

  function addPlannerBlock(dayId, base) {
    return updatePlanner((planner) => ({
      ...planner,
      days: planner.days.map((day) =>
        day.id === dayId ? { ...day, blocks: [...day.blocks, createBlock(base)].sort(sortByStartTime) } : day
      )
    }));
  }

  function updatePlannerBlock(dayId, blockId, patch) {
    return updatePlanner((planner) => ({
      ...planner,
      days: planner.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              blocks: day.blocks
                .map((block) => {
                  if (block.id !== blockId) {
                    return block;
                  }
                  const merged = { ...block, ...patch };
                  return createBlock({ ...merged, id: block.id });
                })
                .sort(sortByStartTime)
            }
          : day
      )
    }));
  }

  function deletePlannerBlock(dayId, blockId) {
    return updatePlanner((planner) => ({
      ...planner,
      days: planner.days.map((day) =>
        day.id === dayId ? { ...day, blocks: day.blocks.filter((block) => block.id !== blockId) } : day
      )
    }));
  }

  function movePlannerBlock(dayId, blockId, direction) {
    return updatePlanner((planner) => ({
      ...planner,
      days: planner.days.map((day) => {
        if (day.id !== dayId) {
          return day;
        }
        const index = day.blocks.findIndex((block) => block.id === blockId);
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || targetIndex < 0 || targetIndex >= day.blocks.length) {
          return day;
        }
        const nextBlocks = [...day.blocks];
        const temp = nextBlocks[index];
        nextBlocks[index] = nextBlocks[targetIndex];
        nextBlocks[targetIndex] = temp;
        return { ...day, blocks: nextBlocks };
      })
    }));
  }

  function moveBlockAcrossDays(sourceDayId, blockId, targetDayId) {
    return updatePlanner((planner) => {
      let movedBlock = null;
      const days = planner.days.map((day) => {
        if (day.id !== sourceDayId) {
          return day;
        }
        movedBlock = day.blocks.find((block) => block.id === blockId) || null;
        return { ...day, blocks: day.blocks.filter((block) => block.id !== blockId) };
      });
      if (!movedBlock) {
        return planner;
      }
      return {
        ...planner,
        days: days.map((day) =>
          day.id === targetDayId ? { ...day, blocks: [...day.blocks, movedBlock].sort(sortByStartTime) } : day
        )
      };
    });
  }

  function createFeedback(payload) {
    const store = getStore();
    store.feedbackSubmissions.unshift({
      id: uid("feedback"),
      status: "pending",
      createdAt: new Date().toISOString(),
      ...payload
    });
    saveStore(store);
    return store.feedbackSubmissions[0];
  }

  function updateGuides(updater) {
    const store = getStore();
    store.guides = typeof updater === "function" ? updater(store.guides) : { ...store.guides, ...updater };
    saveStore(store);
    return store.guides;
  }

  function updateGuideSection(section, sectionId, patch) {
    return updateGuides((guides) => ({
      ...guides,
      [section]: guides[section].map((item) => (item.id === sectionId ? { ...item, ...patch } : item))
    }));
  }

  function addGuideSection(section, base) {
    const next = section === "hotels"
      ? { id: uid("hotel-area"), area: base.area || "新區域", intro: base.intro || "", hotels: [] }
      : { id: uid("conn-category"), category: base.category || "新分類", items: [] };
    return updateGuides((guides) => ({
      ...guides,
      [section]: [...guides[section], next]
    }));
  }

  function deleteGuideSection(section, sectionId) {
    return updateGuides((guides) => ({
      ...guides,
      [section]: guides[section].filter((item) => item.id !== sectionId)
    }));
  }

  function moveGuideSection(section, sectionId, direction) {
    return updateGuides((guides) => ({
      ...guides,
      [section]: moveInArray(guides[section], sectionId, direction)
    }));
  }

  function addGuideItem(section, parentId, base) {
    return updateGuides((guides) => {
      if (section === "tickets") {
        return {
          ...guides,
          tickets: [...guides.tickets, { id: uid("ticket"), name: base.name || "新票券", pass: base.pass || "", summary: base.summary || "" }]
        };
      }

      const itemKey = section === "hotels" ? "hotels" : "items";
      const newItem = section === "hotels"
        ? { id: uid("hotel"), name: base.name || "新飯店", stars: base.stars || "3 星", summary: base.summary || "" }
        : { id: uid("conn-item"), name: base.name || "新項目", summary: base.summary || "" };
      return {
        ...guides,
        [section]: guides[section].map((group) =>
          group.id === parentId ? { ...group, [itemKey]: [...group[itemKey], newItem] } : group
        )
      };
    });
  }

  function updateGuideItem(section, itemId, patch, parentId) {
    return updateGuides((guides) => {
      if (section === "tickets") {
        return {
          ...guides,
          tickets: guides.tickets.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
        };
      }

      const itemKey = section === "hotels" ? "hotels" : "items";
      return {
        ...guides,
        [section]: guides[section].map((group) =>
          group.id === parentId
            ? { ...group, [itemKey]: group[itemKey].map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }
            : group
        )
      };
    });
  }

  function deleteGuideItem(section, itemId, parentId) {
    return updateGuides((guides) => {
      if (section === "tickets") {
        return {
          ...guides,
          tickets: guides.tickets.filter((item) => item.id !== itemId)
        };
      }

      const itemKey = section === "hotels" ? "hotels" : "items";
      return {
        ...guides,
        [section]: guides[section].map((group) =>
          group.id === parentId ? { ...group, [itemKey]: group[itemKey].filter((item) => item.id !== itemId) } : group
        )
      };
    });
  }

  function moveGuideItem(section, itemId, direction, parentId) {
    return updateGuides((guides) => {
      if (section === "tickets") {
        return {
          ...guides,
          tickets: moveInArray(guides.tickets, itemId, direction)
        };
      }

      const itemKey = section === "hotels" ? "hotels" : "items";
      return {
        ...guides,
        [section]: guides[section].map((group) =>
          group.id === parentId ? { ...group, [itemKey]: moveInArray(group[itemKey], itemId, direction) } : group
        )
      };
    });
  }

  function updateMapEmbed(embedHtml) {
    return updateGuides((guides) => ({
      ...guides,
      mapEmbed: embedHtml
    }));
  }

  function moveInArray(items, itemId, direction) {
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= items.length) {
      return items;
    }
    const next = [...items];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    return next;
  }

  function updateFeedbackStatus(id, status) {
    const store = getStore();
    store.feedbackSubmissions = store.feedbackSubmissions.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    saveStore(store);
  }

  function timeToMinutes(value) {
    if (!value || !value.includes(":")) {
      return 0;
    }
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function analyzePlanner(planner) {
    const findings = [];

    planner.days.forEach((day) => {
      day.blocks.forEach((block, index) => {
        const start = timeToMinutes(block.startTime);
        const end = timeToMinutes(block.endTime);

        if (start >= end) {
          findings.push({
            level: "error",
            title: `${day.label} 的 ${block.title} 時間有誤`,
            message: "開始時間晚於或等於結束時間，這個區塊需要重新調整。"
          });
        }

        if (block.type === "activity") {
          const details = enrichPlace(block.place);
          findings.push({
            level: "note",
            title: `${block.place} 注意事項`,
            message: details.caution
          });
        }

        if (block.type === "flight") {
          findings.push({
            level: "tip",
            title: `${block.title} 航班提醒`,
            message: block.caution
          });
        }

        if (index > 0) {
          const previous = day.blocks[index - 1];
          const prevEnd = timeToMinutes(previous.endTime);
          const buffer = start - prevEnd;

          if (buffer < 0) {
            findings.push({
              level: "error",
              title: `${previous.title} 與 ${block.title} 時間重疊`,
              message: "前後兩段區塊有衝突，照目前排法無法執行。"
            });
          }

          if (previous.type === "activity" && block.type === "activity") {
            findings.push({
              level: "warn",
              title: `${day.label} 缺少交通區塊`,
              message: `${previous.place} 和 ${block.place} 中間建議插入獨立交通區塊，方便列出交通方式。`
            });
          }

          if (previous.type === "transport" && buffer > 20) {
            findings.push({
              level: "tip",
              title: `${previous.title} 後留有空檔`,
              message: `交通結束到下一段開始有 ${buffer} 分鐘，可保留當緩衝或再調整更緊湊。`
            });
          }
        }
      });
    });

    if (!findings.length) {
      findings.push({
        level: "ok",
        title: "目前沒有明顯衝突",
        message: "這份行程的時間與路線目前看起來可行。"
      });
    }

    return findings;
  }

  window.tripPlannerStore = {
    getStore,
    savePlannerMeta,
    addPlannerBlock,
    updatePlannerBlock,
    deletePlannerBlock,
    movePlannerBlock,
    moveBlockAcrossDays,
    updateGuideSection,
    addGuideSection,
    deleteGuideSection,
    moveGuideSection,
    addGuideItem,
    updateGuideItem,
    deleteGuideItem,
    moveGuideItem,
    updateMapEmbed,
    createFeedback,
    updateFeedbackStatus,
    analyzePlanner
  };
})();
