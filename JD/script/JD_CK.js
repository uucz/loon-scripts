/*
 * JD CK Capture for Loon
 * Version: 1.0.0
 * Privacy: Cookie data is processed and stored locally only.
 */

const STORE_KEY = "JD_CK_ACCOUNTS_V1";
const MAX_ACCOUNTS = 20;

function getHeader(headers, name) {
  if (!headers) return "";
  const target = String(name).toLowerCase();
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === target) return String(headers[keys[i]] || "");
  }
  return "";
}

function pickCookie(cookie, key) {
  const expression = new RegExp("(?:^|;\\s*)" + key + "=([^;]+)", "i");
  const match = String(cookie || "").match(expression);
  return match ? match[1].trim() : "";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
}

function loadAccounts() {
  const raw = $persistentStore.read(STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveAccounts(accounts) {
  return $persistentStore.write(
    JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)),
    STORE_KEY
  );
}

function finish() {
  $done({});
}

try {
  const headers = ($request && $request.headers) || {};
  const cookie = getHeader(headers, "Cookie");
  const ptKey = pickCookie(cookie, "pt_key");
  const ptPin = pickCookie(cookie, "pt_pin");

  if (!ptKey || !ptPin || ptKey.length < 8) {
    finish();
  } else {
    const now = new Date().toISOString();
    const ck = "pt_key=" + ptKey + ";pt_pin=" + ptPin + ";";
    const accounts = loadAccounts();
    let index = -1;

    for (let i = 0; i < accounts.length; i++) {
      if (accounts[i] && accounts[i].pt_pin === ptPin) {
        index = i;
        break;
      }
    }

    let status = "";
    const record = {
      pt_pin: ptPin,
      pt_key: ptKey,
      ck: ck,
      updated_at: now
    };

    if (index === -1) {
      accounts.unshift(record);
      status = "已获取新账号";
    } else if (accounts[index].pt_key !== ptKey) {
      accounts.splice(index, 1);
      accounts.unshift(record);
      status = "CK 已更新";
    }

    if (status) {
      saveAccounts(accounts);
      $notification.post(
        "京东 CK 获取成功",
        status + "：" + safeDecode(ptPin),
        ck + "\n\n长按通知可复制。CK 等同登录凭证，请勿分享；复制后建议关闭本插件。"
      );
      console.log("[JD CK] Saved account: " + safeDecode(ptPin));
    }

    finish();
  }
} catch (error) {
  console.log("[JD CK] Error: " + String(error));
  finish();
}
