# 真實 API 串接方向

目前前端已經預留三類後端代理端點：

- `POST /api/ai/itinerary-check`
  - 把整份行程送到 Gemini，請模型檢查路線順不順、時間會不會太趕、景點要注意什麼
- `POST /api/naver/route`
  - 把一天的活動景點送去 NAVER Maps 做 geocoding + directions
- `GET /api/flights/search`
  - 從航班供應商查指定日期與航線的班次

## 為什麼要走後端代理

- Gemini API key 也不應暴露在瀏覽器端
- NAVER Maps 與航班 API 也都需要金鑰與簽署資訊
- 因此前端只打你自己的 `/api/*`，真正的外部請求由後端代打

## 建議後端流程

### 1. Gemini / Vertex AI 行程檢查

- 收到完整行程資料
- 把每天的 `航班 / 交通 / 景點` 區塊整理成結構化 JSON
- 呼叫 Gemini API，或在有 Google Cloud ADC 時改走 Vertex AI
- 回傳：
  - 時間衝突
  - 路線順序建議
  - 缺少交通區塊提醒
  - 景點營業時間或注意事項

### 2. NAVER 路線查詢

- 先把景點名稱送去 Geocoding API 換成座標
- 再把同一天的景點座標送去 Directions API
- 回傳：
  - 順序
  - 距離
  - 所需時間
  - 路線摘要
  - 可畫在地圖上的點位

### 3. 航班查詢

- 建議用 Amadeus Self-Service Flight APIs
- 用日期、出發地、目的地查去程、回程或中途加入旅客的航班
- 可把回傳的班號、時間、航廈自動塞回行程中的航班區塊

## 官方文件

- Gemini API key：<https://ai.google.dev/gemini-api/docs/api-key>
- Gemini generateContent：<https://ai.google.dev/gemini-api/docs/text-generation>
- Vertex AI quickstart：<https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart>
- NAVER Maps overview：<https://api.ncloud-docs.com/docs/en/application-maps-overview>
- NAVER Geocoding：<https://api.ncloud-docs.com/docs/en/ai-naver-mapsgeocoding-geocode>
- NAVER Directions：<https://api.ncloud-docs.com/en/ai-naver-mapsdirections-driving>
- Amadeus Flights：<https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/resources/flights/>

## 目前限制

這個工作區現在沒有 Node.js / Python SDK / .NET SDK，所以我先把前端資料結構和後端代理介面設計好，還不能在本機真正跑起外部 API 代理伺服器。
