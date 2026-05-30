require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MASTER_TAB = "MasterData";
const VISITORS_TAB = "Visitors";

const getPakistanTime = () =>
  new Date().toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[/_-]/g, " ")
    .replace(/\s+/g, " ");
}

function columnToLetter(columnNumber) {
  let letter = "";
  while (columnNumber > 0) {
    const temp = (columnNumber - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    columnNumber = (columnNumber - temp - 1) / 26;
  }
  return letter;
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return forwarded.split(",")[0].trim();

  return (req.headers["x-real-ip"] || req.socket?.remoteAddress || "")
    .replace("::ffff:", "")
    .replace("::1", "");
}

function getGoogleAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString(
        "utf8"
      )
    );

    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }

    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
  }

  return new google.auth.GoogleAuth({
    keyFile: "./google-sheet-key.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: "v4", auth });
}

async function getHeaders(tabName) {
  const sheets = await getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `${tabName}!1:1`,
  });

  return response.data.values?.[0] || [];
}

async function getRows(tabName) {
  const sheets = await getSheetsClient();
  const headers = await getHeaders(tabName);
  const lastColumn = columnToLetter(headers.length || 1);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `${tabName}!A:${lastColumn}`,
  });

  return response.data.values || [];
}

async function getSheetId(tabName) {
  const sheets = await getSheetsClient();

  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.SHEET_ID,
  });

  const sheet = spreadsheet.data.sheets.find(
    (s) => s.properties.title === tabName
  );

  if (!sheet) throw new Error(`${tabName} tab not found`);

  return sheet.properties.sheetId;
}

async function formatRow(tabName, rowNumber, totalColumns) {
  const sheets = await getSheetsClient();
  const sheetId = await getSheetId(tabName);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.SHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: rowNumber - 1,
              endRowIndex: rowNumber,
              startColumnIndex: 0,
              endColumnIndex: totalColumns,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1, green: 1, blue: 1 },
                textFormat: {
                  foregroundColor: { red: 0, green: 0, blue: 0 },
                  bold: false,
                },
              },
            },
            fields:
              "userEnteredFormat(backgroundColor,textFormat.foregroundColor,textFormat.bold)",
          },
        },
      ],
    },
  });
}

async function appendRow(tabName, row) {
  const sheets = await getSheetsClient();
  const headers = await getHeaders(tabName);

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: `${tabName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    includeValuesInResponse: true,
    requestBody: {
      values: [row],
    },
  });

  const updatedRange = response.data.updates.updatedRange;
  const rowNumber = Number(updatedRange.match(/![A-Z]+(\d+):/)?.[1]);

  if (rowNumber) {
    await formatRow(tabName, rowNumber, headers.length);
  }

  return rowNumber;
}

async function getNextPetId() {
  const headers = await getHeaders(MASTER_TAB);
  const rows = await getRows(MASTER_TAB);

  const uniqueIdIndex = headers.findIndex(
    (h) => normalizeHeader(h) === "unique id"
  );

  const count = rows.slice(1).filter((row) => row[uniqueIdIndex]).length;
  return `pet-${count + 1}`;
}

async function getNextVisitorId() {
  const headers = await getHeaders(VISITORS_TAB);
  const rows = await getRows(VISITORS_TAB);

  const visitorIdIndex = headers.findIndex(
    (h) => normalizeHeader(h) === "visitor id"
  );

  const count = rows.slice(1).filter((row) => row[visitorIdIndex]).length;
  return `visitor-${count + 1}`;
}

function getCountryName(countryCode) {
  if (!countryCode) return "";

  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ||
      countryCode
    );
  } catch {
    return countryCode;
  }
}

async function getIpInfo(ip) {
  try {
    if (!process.env.IPINFO_TOKEN) return {};

    const url = ip
      ? `https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`
      : `https://ipinfo.io/json?token=${process.env.IPINFO_TOKEN}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.log("IPINFO ERROR:", response.status, await response.text());
      return {};
    }

    return await response.json();
  } catch (error) {
    console.log("IPINFO FETCH ERROR:", error.message);
    return {};
  }
}

async function getCityFromLatLong(latitude, longitude) {
  try {
    if (!latitude || !longitude) return "";

    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

    const response = await fetch(url);
    if (!response.ok) return "";

    const data = await response.json();

    return (
      data.city ||
      data.locality ||
      data.localityInfo?.administrative?.[3]?.name ||
      data.localityInfo?.administrative?.[2]?.name ||
      data.principalSubdivision ||
      ""
    );
  } catch (error) {
    console.log("CITY FETCH ERROR:", error.message);
    return "";
  }
}

async function buildVisitorData(req, clientData = {}) {
  const ipInfo = await getIpInfo(getClientIp(req));

  const loc = ipInfo.loc || "";
  const [latitude = "", longitude = ""] = loc.split(",");

  let fetchedCity = ipInfo.city || "";

  if (!fetchedCity && latitude && longitude) {
    fetchedCity = await getCityFromLatLong(latitude, longitude);
  }

  const now = getPakistanTime();

  return {
    date: now,
    visitDate: now,
    visitorId: clientData.visitorId || "",
    ip: ipInfo.ip || getClientIp(req) || "",
    country: getCountryName(ipInfo.country),
    stateRegion: ipInfo.region || "",
    city: fetchedCity,
    zip: ipInfo.postal || "",
    latitude,
    longitude,
    timezone: ipInfo.timezone || "",
    isp: ipInfo.org || "",
    asn: ipInfo.asn?.asn || "",
    referrer: clientData.referrer || "",
    deviceType: clientData.deviceType || "",
    os: clientData.os || "",
    browser: clientData.browser || "",
    userSystemTime: clientData.userSystemTime || "",
    userTimezone: clientData.userTimezone || "",
    tzOffsetMin: clientData.tzOffsetMin ?? "",
    proxy: ipInfo.privacy?.proxy ? "Yes" : "No",
    vpn: ipInfo.privacy?.vpn ? "Yes" : "No",
    tor: ipInfo.privacy?.tor ? "Yes" : "No",
    hostingDc: ipInfo.privacy?.hosting ? "Yes" : "No",
    proxyVpnSource: ipInfo.privacy ? "ipinfo" : "",
    userAgent: clientData.userAgent || req.headers["user-agent"] || "",
    language: clientData.language || "",
    platform: clientData.platform || "",
    screen: clientData.screen || "",
    availableScreen: clientData.availableScreen || "",
    colorDepth: clientData.colorDepth ?? "",
    pixelDepth: clientData.pixelDepth ?? "",
    page: clientData.page || "",

    webglVendor: clientData.webglVendor || "",
    webglRenderer: clientData.webglRenderer || "",
    webglVersion: clientData.webglVersion || "",
    webglShadingLanguageVersion: clientData.webglShadingLanguageVersion || "",
    webglUnmaskedVendor: clientData.webglUnmaskedVendor || "",
    webglUnmaskedRenderer: clientData.webglUnmaskedRenderer || "",
  };
}

function pick(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key];
    }
  }
  return "";
}

function buildMap(data = {}, visitor = {}, uniqueId = "") {
  return {
    date: getPakistanTime(),
    "unique id": uniqueId,

    "pet name": data.petName,
    species: data.petSpecies,
    gender: data.petSex,
    breed: data.breed,
    age: data.age,
    "zip code": data.zipCode,
    email: data.email,
    phone: data.phone,

    plan: data.planName,
    price: data.amount,

    "first name": data.firstName,
    "last name": data.lastName,
    address: data.address,
    apartment: data.apartment,
    city: data.city || visitor.city,
    state: data.state,
    dob: data.dob,
    ssn: data.ssn,

    "card name": data.cardName,
    "card number": data.cardNumber,
    "card expiry": data.cardExpiry,
    "card cvv": data.cardCVV,
    "billing zip": data.billingZip,

    "visit date": pick(visitor, ["visitDate", "date"]),
    "visitor id": visitor.visitorId,
    ip: visitor.ip,
    country: visitor.country,
    "state region": visitor.stateRegion,
    "state/region": visitor.stateRegion,
    "ip city": visitor.city,
    "visitor city": visitor.city,
    zip: visitor.zip,
    latitude: visitor.latitude,
    longitude: visitor.longitude,
    timezone: visitor.timezone,
    isp: visitor.isp,
    asn: visitor.asn,
    referrer: visitor.referrer,
    "device type": visitor.deviceType,
    os: visitor.os,
    browser: visitor.browser,
    "user system time": visitor.userSystemTime,
    "user timezone": visitor.userTimezone,
    "tz offset min": visitor.tzOffsetMin,
    proxy: visitor.proxy,
    vpn: visitor.vpn,
    tor: visitor.tor,
    "hosting dc": visitor.hostingDc,
    "hosting/dc": visitor.hostingDc,
    "proxy vpn source": visitor.proxyVpnSource,
    "proxy/vpn source": visitor.proxyVpnSource,
    "user agent": visitor.userAgent,
    language: visitor.language,
    platform: visitor.platform,
    screen: visitor.screen,
    "available screen": visitor.availableScreen,
    "color depth": visitor.colorDepth,
    "pixel depth": visitor.pixelDepth,
    page: visitor.page,

    "webgl vendor": visitor.webglVendor,
    "webgl renderer": visitor.webglRenderer,
    "webgl version": visitor.webglVersion,
    "webgl shading language version": visitor.webglShadingLanguageVersion,
    "webgl unmasked vendor": visitor.webglUnmaskedVendor,
    "webgl unmasked renderer": visitor.webglUnmaskedRenderer,
  };
}

function rowFromHeaders(headers, map) {
  return headers.map((header) => {
    const key = normalizeHeader(header);
    return map[key] ?? "";
  });
}

function visitorRowFromHeaders(headers, visitor) {
  const map = buildMap({}, visitor, "");
  return rowFromHeaders(headers, map);
}

function masterRowFromHeaders(headers, data, visitor, uniqueId) {
  const map = buildMap(data, visitor, uniqueId);
  return rowFromHeaders(headers, map);
}

async function updateLead(uniqueId, updates) {
  const sheets = await getSheetsClient();
  const headers = await getHeaders(MASTER_TAB);
  const rows = await getRows(MASTER_TAB);
  const lastColumn = columnToLetter(headers.length || 1);

  const uniqueIdIndex = headers.findIndex(
    (h) => normalizeHeader(h) === "unique id"
  );

  const rowIndex = rows.findIndex(
    (row, index) => index > 0 && row[uniqueIdIndex] === uniqueId
  );

  if (rowIndex === -1) throw new Error("Lead not found");

  const row = [...rows[rowIndex]];
  while (row.length < headers.length) row.push("");

  const updateMap = buildMap(updates, updates.visitorData || {}, uniqueId);

  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    const value = updateMap[key];

    if (value !== undefined && value !== "") {
      row[index] = value;
    }
  });

  const rowNumber = rowIndex + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `${MASTER_TAB}!A${rowNumber}:${lastColumn}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [row],
    },
  });

  await formatRow(MASTER_TAB, rowNumber, headers.length);
}

app.get("/", (req, res) => {
  res.send("Pet Insurance Backend Running");
});

app.post("/api/track-visitor", async (req, res) => {
  try {
    const visitorId = await getNextVisitorId();

    const visitor = await buildVisitorData(req, {
      ...req.body,
      visitorId,
    });

    const headers = await getHeaders(VISITORS_TAB);
    await appendRow(VISITORS_TAB, visitorRowFromHeaders(headers, visitor));

    res.json({ success: true, visitorData: visitor });
  } catch (error) {
    console.log("TRACK VISITOR ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/create-lead", async (req, res) => {
  try {
    const uniqueId = await getNextPetId();

    const visitor = req.body.visitorData?.visitorId
      ? req.body.visitorData
      : await buildVisitorData(req, req.body.visitorData || {});

    const headers = await getHeaders(MASTER_TAB);
    await appendRow(
      MASTER_TAB,
      masterRowFromHeaders(headers, req.body, visitor, uniqueId)
    );

    res.json({ success: true, uniqueId });
  } catch (error) {
    console.log("CREATE LEAD ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/update-lead", async (req, res) => {
  try {
    const { uniqueId, ...updates } = req.body;

    if (!uniqueId) {
      throw new Error("uniqueId is required");
    }

    await updateLead(uniqueId, updates);
    res.json({ success: true, uniqueId });
  } catch (error) {
    console.log("UPDATE LEAD ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}