import { createServer } from "node:http";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = __dirname;
const envFilePath = join(rootDir, "backend", ".env");
loadEnv(envFilePath);
const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "945269";
const ADMIN_COOKIE = "busan_admin_auth=1; Path=/; HttpOnly; SameSite=Lax";
const ADMIN_COOKIE_CLEAR = "busan_admin_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/ai/itinerary-check") {
      const body = await readJson(req);
      return sendJson(res, 200, await handleAiCheck(body));
    }

    if (req.method === "POST" && req.url === "/api/admin/login") {
      const body = await readJson(req);
      if (body.password === ADMIN_PASSWORD) {
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Set-Cookie": ADMIN_COOKIE
        });
        res.end(JSON.stringify({ ok: true }));
      } else {
        sendJson(res, 401, { ok: false, message: "密碼錯誤" });
      }
      return;
    }

    if (req.method === "POST" && req.url === "/api/admin/logout") {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": ADMIN_COOKIE_CLEAR
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/api/naver/route") {
      const body = await readJson(req);
      return sendJson(res, 200, await handleNaverRoute(body));
    }

    if (req.method === "GET" && req.url === "/api/settings") {
      return sendJson(res, 200, getSettingsPayload());
    }

    if (req.method === "POST" && req.url === "/api/settings") {
      const body = await readJson(req);
      saveSettings(body);
      return sendJson(res, 200, { ok: true, settings: getSettingsPayload() });
    }

    if (req.method === "POST" && req.url === "/api/settings/test") {
      const body = await readJson(req);
      return sendJson(res, 200, await testProvider(body.provider));
    }

    iif (req.method === "GET" && req.url?.startsWith("/api/flights/search")) {
     const url = new URL(req.url, `http://${req.headers.host}`);
     return sendJson(res, 200, await handleFlightSearch(url.searchParams));
   }

   // 支援 /assets/ 路由（相容性處理）
   if (req.method === "GET" && req.url?.startsWith("/assets/")) {
     const assetPath = req.url.replace(/^\/assets\//, "/");
     const newReq = { ...req, url: assetPath };
     return serveStatic(newReq, res);
   }

   return serveStatic(req, res);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown server error"
    });
  }
}).listen(PORT, () => {
  console.log(`Busan planner server listening on http://localhost:${PORT}`);
});

function loadEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }
  const source = readFileSync(filePath, "utf8");
  source.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) {
      return;
    }
    const idx = line.indexOf("=");
    if (idx === -1) {
      return;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function getSettingsPayload() {
  return {
    gemini: {
      apiKey: maskSecret(process.env.GEMINI_API_KEY),
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash"
    },
    gcp: {
      projectId: process.env.GCP_PROJECT_ID || "",
      location: process.env.GCP_LOCATION || "us-central1"
    },
    naver: {
      clientId: maskSecret(process.env.NAVER_MAP_CLIENT_ID),
      clientSecret: maskSecret(process.env.NAVER_MAP_CLIENT_SECRET)
    },
    amadeus: {
      clientId: maskSecret(process.env.AMADEUS_CLIENT_ID),
      clientSecret: maskSecret(process.env.AMADEUS_CLIENT_SECRET),
      baseUrl: process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"
    }
  };
}

function maskSecret(value) {
  if (!value) {
    return "";
  }
  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`;
  }
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function saveSettings(body) {
  const nextEnv = {
    GEMINI_API_KEY: body.openaiApiKey || process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: body.openaiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    GCP_PROJECT_ID: body.gcpProjectId || process.env.GCP_PROJECT_ID || "",
    GCP_LOCATION: body.gcpLocation || process.env.GCP_LOCATION || "us-central1",
    NAVER_MAP_CLIENT_ID: body.naverClientId || process.env.NAVER_MAP_CLIENT_ID || "",
    NAVER_MAP_CLIENT_SECRET: body.naverClientSecret || process.env.NAVER_MAP_CLIENT_SECRET || "",
    AMADEUS_CLIENT_ID: body.amadeusClientId || process.env.AMADEUS_CLIENT_ID || "",
    AMADEUS_CLIENT_SECRET: body.amadeusClientSecret || process.env.AMADEUS_CLIENT_SECRET || "",
    AMADEUS_BASE_URL: body.amadeusBaseUrl || process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"
  };

  Object.entries(nextEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });

  const content = Object.entries(nextEnv)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  writeFileSync(envFilePath, `${content}\n`, "utf8");
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(payload, null, 2));
}

async function serveStatic(req, res) {
  const pathname = req.url === "/" ? "/index.html" : req.url || "/index.html";
  const isAdminPath = pathname === "/admin.html";
  if (isAdminPath && !isAdminAuthenticated(req)) {
    res.writeHead(302, { Location: "/login.html" });
    res.end();
    return;
  }
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(rootDir, safePath);

  if (!filePath.startsWith(rootDir) || !existsSync(filePath) || statSafe(filePath)?.isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const content = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
  });
  res.end(content);
}

function isAdminAuthenticated(req) {
  const cookie = req.headers.cookie || "";
  return cookie.includes("busan_admin_auth=1");
}

function statSafe(filePath) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

async function handleAiCheck(body) {
  const planner = body.planner || body;
  try {
    return await callGemini(planner);
  } catch (error) {
    return {
      ok: true,
      source: "fallback",
      findings: localAiCheck(planner),
      note: error instanceof Error ? error.message : "AI provider unavailable"
    };
  }
}

async function callGemini(planner) {
  const model = process.env.GEMINI_MODEL || planner.apiConfig?.aiModel || "gemini-2.5-flash";
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "你是一位韓國自由行行程審核助理。請審查包含航班、交通、景點的行程區塊，並且只回傳 JSON。每筆 findings 都必須包含 level、title、message。level 只允許 error、warn、tip、note。請用繁體中文撰寫 title 和 message，重點檢查路線是否順、是否缺少交通區塊、時間是否過緊、以及景點提醒事項。\n\nItinerary JSON:\n" +
              JSON.stringify(planner)
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          findings: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                level: { type: "STRING" },
                title: { type: "STRING" },
                message: { type: "STRING" }
              },
              required: ["level", "title", "message"]
            }
          }
        },
        required: ["findings"]
      }
    },
    systemInstruction: {
      parts: [{ text: "請只回傳嚴格 JSON，不要輸出 markdown，並且所有說明都使用繁體中文。" }]
    }
  };

  let response;
  if (process.env.GCP_PROJECT_ID) {
    const token = await getAccessTokenFromGcloud();
    const location = process.env.GCP_LOCATION || "us-central1";
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT_ID}/locations/${location}/publishers/google/models/${model}:generateContent`;
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
  } else if (process.env.GEMINI_API_KEY) {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify(requestBody)
    });
  } else {
    throw new Error("尚未設定 Gemini API key，也尚未設定 GCP Project + ADC。");
  }

  const json = await response.json();
  const parsed = safeParseJson(json.candidates?.[0]?.content?.parts?.[0]?.text || "");
  const findings = await ensureChineseFindings(parsed?.findings || localAiCheck(planner), model);
  return {
    ok: response.ok,
    source: process.env.GCP_PROJECT_ID ? "vertex-ai" : "gemini",
    findings,
    raw: response.ok ? undefined : json
  };
}

async function handleNaverRoute(body) {
  const day = body.day || body;
  const activityBlocks = (day.blocks || []).filter((block) => block.type === "activity" && block.place);

  if (!process.env.NAVER_MAP_CLIENT_ID || !process.env.NAVER_MAP_CLIENT_SECRET) {
    return {
      ok: true,
      source: "fallback",
      summary: {
        title: day.label,
        stops: activityBlocks.map((block) => ({
          name: block.place,
          searchUrl: `https://map.naver.com/p/search/${encodeURIComponent(block.place)}`
        }))
      },
      note: "NAVER API 金鑰尚未設定，先回傳搜尋連結摘要。"
    };
  }

  const coordinates = [];
  for (const block of activityBlocks) {
    const geocodeUrl = new URL("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode");
    geocodeUrl.searchParams.set("query", block.place);
    geocodeUrl.searchParams.set("count", "1");
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        "x-ncp-apigw-api-key-id": process.env.NAVER_MAP_CLIENT_ID,
        "x-ncp-apigw-api-key": process.env.NAVER_MAP_CLIENT_SECRET,
        Accept: "application/json"
      }
    });
    const geocodeJson = await geocodeResponse.json();
    const address = geocodeJson.addresses?.[0];
    if (address) {
      coordinates.push({
        name: block.place,
        x: address.x,
        y: address.y
      });
    }
  }

  if (coordinates.length < 2) {
    return {
      ok: true,
      source: "naver",
      summary: {
        title: day.label,
        stops: coordinates
      }
    };
  }

  const start = `${coordinates[0].x},${coordinates[0].y}`;
  const goal = `${coordinates[coordinates.length - 1].x},${coordinates[coordinates.length - 1].y}`;
  const waypoints = coordinates.slice(1, -1).map((item) => `${item.x},${item.y}`).join("|");
  const directionsUrl = new URL("https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving");
  directionsUrl.searchParams.set("start", start);
  directionsUrl.searchParams.set("goal", goal);
  directionsUrl.searchParams.set("option", "traoptimal");
  directionsUrl.searchParams.set("lang", "zh");
  if (waypoints) {
    directionsUrl.searchParams.set("waypoints", waypoints);
  }

  const directionsResponse = await fetch(directionsUrl, {
    headers: {
      "x-ncp-apigw-api-key-id": process.env.NAVER_MAP_CLIENT_ID,
      "x-ncp-apigw-api-key": process.env.NAVER_MAP_CLIENT_SECRET
    }
  });
  const directionsJson = await directionsResponse.json();
  const route = directionsJson.route?.traoptimal?.[0];

  return {
    ok: directionsResponse.ok,
    source: "naver",
    summary: {
      title: day.label,
      stops: coordinates,
      distanceMeters: route?.summary?.distance || null,
      durationMs: route?.summary?.duration || null,
      path: route?.path || [],
      guide: route?.guide || []
    }
  };
}

async function handleFlightSearch(searchParams) {
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const departureDate = searchParams.get("departureDate");

  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
    return {
      ok: true,
      source: "fallback",
      query: { origin, destination, departureDate },
      note: "Amadeus 金鑰尚未設定，先回傳查詢參數。"
    };
  }

  const tokenResponse = await fetch(`${process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET
    })
  });
  const tokenJson = await tokenResponse.json();

  const offersUrl = new URL(`${process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"}/v2/shopping/flight-offers`);
  offersUrl.searchParams.set("originLocationCode", origin || "TPE");
  offersUrl.searchParams.set("destinationLocationCode", destination || "PUS");
  offersUrl.searchParams.set("departureDate", departureDate || "2026-04-26");
  offersUrl.searchParams.set("adults", "1");
  offersUrl.searchParams.set("max", "5");

  const offersResponse = await fetch(offersUrl, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`
    }
  });
  const offersJson = await offersResponse.json();

  return {
    ok: offersResponse.ok,
    source: "amadeus",
    data: offersJson.data || [],
    dictionaries: offersJson.dictionaries || {}
  };
}

async function testProvider(provider) {
  if (provider === "gemini") {
    if (process.env.GCP_PROJECT_ID) {
      try {
        const token = await getAccessTokenFromGcloud();
        return {
          ok: Boolean(token),
          provider,
          message: token ? "Vertex AI ADC 連線成功" : "Vertex AI ADC 連線失敗"
        };
      } catch (error) {
        return {
          ok: false,
          provider,
          message: error instanceof Error ? error.message : "Vertex AI ADC 連線失敗"
        };
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return { ok: false, provider, message: "尚未設定 Gemini API key，也尚未設定 Vertex AI ADC" };
    }
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY }
    });
    return {
      ok: response.ok,
      provider,
      message: response.ok ? "Gemini 連線成功" : "Gemini 連線失敗",
      status: response.status
    };
  }

  if (provider === "naver") {
    if (!process.env.NAVER_MAP_CLIENT_ID || !process.env.NAVER_MAP_CLIENT_SECRET) {
      return { ok: false, provider, message: "尚未設定 NAVER API 金鑰" };
    }
    const url = new URL("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode");
    url.searchParams.set("query", "부산역");
    const response = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": process.env.NAVER_MAP_CLIENT_ID,
        "x-ncp-apigw-api-key": process.env.NAVER_MAP_CLIENT_SECRET
      }
    });
    return {
      ok: response.ok,
      provider,
      message: response.ok ? "NAVER 連線成功" : "NAVER 連線失敗",
      status: response.status
    };
  }

  if (provider === "amadeus") {
    if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) {
      return { ok: false, provider, message: "尚未設定 Amadeus 金鑰" };
    }
    const response = await fetch(`${process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com"}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET
      })
    });
    return {
      ok: response.ok,
      provider,
      message: response.ok ? "Amadeus 連線成功" : "Amadeus 連線失敗",
      status: response.status
    };
  }

  return { ok: false, provider, message: "未知的 provider" };
}

async function getAccessTokenFromGcloud() {
  const { stdout } = await execFileAsync("gcloud", ["auth", "application-default", "print-access-token"]);
  const token = stdout.trim();
  if (!token) {
    throw new Error("gcloud 尚未完成 application-default login。");
  }
  return token;
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeFindings(findings) {
  if (!Array.isArray(findings)) {
    return [];
  }

  return findings.map((item) => ({
    level: item.level || "note",
    title: toZhTw(String(item.title || "提醒")),
    message: toZhTw(String(item.message || "請檢查行程安排。"))
  }));
}

async function ensureChineseFindings(findings, model) {
  const normalized = normalizeFindings(findings);
  const needsTranslation = normalized.some((item) => /[A-Za-z]{4,}/.test(`${item.title} ${item.message}`));
  if (!needsTranslation) {
    return normalized;
  }

  try {
    const response = await callGeminiJson(
      {
        findings: normalized
      },
      "請將輸入的 findings 陣列完整翻成繁體中文，保留原本的 level，不要新增或刪除項目，只回傳 JSON。"
    ,
      model
    );
    const parsed = safeParseJson(response.candidates?.[0]?.content?.parts?.[0]?.text || "");
    return normalizeFindings(parsed?.findings || normalized);
  } catch {
    return normalizeFindings(normalized);
  }
}

async function callGeminiJson(payload, instruction, model) {
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${instruction}\n\nInput JSON:\n${JSON.stringify(payload)}` }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          findings: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                level: { type: "STRING" },
                title: { type: "STRING" },
                message: { type: "STRING" }
              },
              required: ["level", "title", "message"]
            }
          }
        },
        required: ["findings"]
      }
    },
    systemInstruction: {
      parts: [{ text: "請只回傳嚴格 JSON，不要輸出 markdown，並且所有說明都使用繁體中文。" }]
    }
  };

  if (process.env.GCP_PROJECT_ID) {
    const token = await getAccessTokenFromGcloud();
    const location = process.env.GCP_LOCATION || "us-central1";
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${process.env.GCP_PROJECT_ID}/locations/${location}/publishers/google/models/${model}:generateContent`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    }).then((res) => res.json());
  }

  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify(requestBody)
  }).then((res) => res.json());
}

function toZhTw(text) {
  const replacements = [
    ["Missing Activity Details", "活動資訊不足"],
    ["Tight Schedule Between Activities", "活動之間時間過緊"],
    ["Transport Details Missing", "缺少交通資訊"],
    ["Incomplete Itinerary", "行程資訊不完整"],
    ["Please fill in these details for a more accurate audit and to ensure a well-planned trip.", "請補上完整資訊，才能更準確地檢查並安排路線。"],
    ["There is only a 30-minute gap (12:00-12:30) between the first and second activity on Day 1. This may not be sufficient for travel, especially if the activities are not co-located. Consider adding more time or specifying transport details.", "第一個活動與第二個活動之間只留了 30 分鐘，若兩地不在同一區，移動時間可能不足，建議增加緩衝或補上交通安排。"],
    ["No transport blocks are included in the itinerary. Please specify how you plan to travel between activities, especially if they are in different locations, to ensure a smooth flow and accurate timing.", "目前行程中沒有交通區塊，建議補上各活動之間的移動方式，特別是不同區域之間。"],
    ["The current itinerary lacks specific details for activities and transport, making a comprehensive review challenging. Provide more information to receive tailored recommendations.", "目前行程缺少足夠的活動與交通細節，建議補充更多資訊以取得更準確的建議。"]
  ];

  let output = text;
  for (const [from, to] of replacements) {
    output = output.replaceAll(from, to);
  }
  return output;
}

function localAiCheck(planner) {
  const findings = [];
  for (const day of planner.days || []) {
    for (let i = 0; i < day.blocks.length; i += 1) {
      const block = day.blocks[i];
      if (i > 0) {
        const previous = day.blocks[i - 1];
        if (previous.type === "activity" && block.type === "activity") {
          findings.push({
            level: "warn",
            title: `${day.label} 缺少交通區塊`,
            message: `${previous.title} 和 ${block.title} 中間建議加入獨立交通區塊。`
          });
        }
      }
      if (block.type === "flight") {
        findings.push({
          level: "note",
          title: `${block.title} 航班提醒`,
          message: block.caution || "請確認報到與行李時間。"
        });
      }
    }
  }
  return findings.length ? findings : [{ level: "ok", title: "目前沒有明顯衝突", message: "本地檢查沒有發現問題。" }];
}
