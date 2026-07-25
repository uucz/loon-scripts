/*
 * JD CK Capture for Loon
 * Local-only: never uploads Cookie data.
 */

const STORE_KEY = "JD_CK_ACCOUNTS_V1";
const MAX_ACCOUNTS = 20;

function getHeader(headers, name) {
  if (!headers) return "";
  const target = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) return String(headers[key] || "");
  }
  return "";
}

function pick(cookie, key) {
  const m = String(cookie || "").match(new RegExp("(?:^|;\\s*)" + key + "=([^;]+)", "i"));
  return m ? m[1].trim() : "";
}

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch (_) { return value; }
}

function mask(value) {
  if (!value) return "";
  if (value.length <= 10) return value.slice(0, 2) + "***";
  return value.slice(0, 6) + "…" + value.slice(-4);
}

function loadAccounts() {
  const raw = $persistentStore.read(STORE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

function saveAccounts(accounts) {
  return $persistentStore.write(JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)), STORE_KEY);
}

function notify(title, subtitle, body) {
  $notification.post(title, subtitle, body);
}

try {
  const cookie = getHeader($request && $request.headers, "Cookie");
  const ptKey = pick(cookie, "pt_key");
  const ptPin = pick(cookie, "pt_pin");

  if (!ptKey || !ptPin || ptKey.length < 8 || ptPin.length < 1) {
    $done({});
  } else {
    const now = new Date().toISOString();
    const accounts = loadAccounts();
    const index = accounts.findIndex(x => x && x.pt_pin === ptPin);
    const ck = `pt_key=${ptKey};pt_pin=${ptPin};`;
    let status = "";

    if (index === -1) {
      accounts.unshift({ pt_pin: ptPin, pt_key: ptKey, ck, updated_at: now });
      status = "已获取新账号";
    } else if (accounts[index].pt_key !== ptKey) {
      const updated = { ...accounts[index], pt_key: ptKey, ck, updated_at: now };
      accounts.splice(index, 1);
      accounts.unshift(updated);
      status = "CK 已更新";
    }

    if (status) {
      saveAccounts(accounts);
      const accountName = safeDecode(ptPin);
      notify(
        "京东 CK 获取成功",
        `${status}：${accountName}`,
        `pt_key=${mask(ptKey)}\npt_pin=${ptPin}\n\n完整 CK 已保存到 Loon 持久化存储。请勿分享通知截图或日志。`
      );
    }

    $done({});
  }
} catch (e) {
  console.log("[JD CK] " + String(e));
  $done({});
}
