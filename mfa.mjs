import dns from "dns";
import http2 from "http2";
import http from "http";
//  always the first   
const password = 'sifre';
const token = "token";
let mfaToken = '';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9164 Chrome/124.0.6367.243 Electron/30.2.0 Safari/537.36',
  'X-Debug-Options': 'bugReporterEnabled',
  'Authorization': token,
  'Accept': '*/*',
  'Content-Type': 'application/json',
  'X-Audit-Log-Reason': '',
  'X-Context-Properties': 'nosniff',
  'X-Discord-Locale': 'tr',
  'X-Discord-Timezone': 'Europe/Istanbul',
  'X-Super-Properties': 'eyJvcyI6IkFuZHJvaWQiLCJicm93c2VyIjoiQW5kcm9pZCBDaHJvbWUiLCJkZXZpY2UiOiJBbmRyb2lkIiwic3lzdGVtX2xvY2FsZSI6InRyLVRSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKExpbnV4OyBBbmRyb2lkIDYuMDsgTmV4dXMgNSBCdWlsZC9NUkE1OE4pIEFwcGxlV2ViS2l0LzUzNy4zNiAoS0hUTUwsIGxpa2UgR2Vja28pIENocm9tZS8xMzEuMC4wLjAgTW9iaWxlIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMzEuMC4wLjAiLCJvc192ZXJzaW9uIjoiNi4wIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tL2NoYW5uZWxzL0BtZS8xMzAzMDQ1MDIyNjQzNTIzNjU1IiwicmVmZXJyaW5nX2RvbWFpbiI6ImRpc2NvcmQuY29tIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM1NTYyNCwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbCwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZX0='
};

dns.resolve4('discord.com', (err, addresses) => {
  if (err) {
    return;
  }
});

async function ticket() {
  try {
    const initialResponse = await http2Request('PATCH', `/api/v9/guilds/0/vanity-url`, headers);

    const data = JSON.parse(initialResponse);

    if (data.code === 200) {
      sendMfaTokenToServer();
    } else if (data.code === 60003) {
      const ticket = data.mfa.ticket;
      await mfa(ticket);
    }
  } catch (error) {}
}

async function mfa(ticket) {
  try {
    const mfaResponse = await http2Request('POST', '/api/v9/mfa/finish', {
      ...headers,
      'Content-Type': 'application/json'
    }, JSON.stringify({
      ticket: ticket,
      mfa_type: 'password',
      data: password
    }));

    const responseData = JSON.parse(mfaResponse);

    if (responseData.token) {
      mfaToken = responseData.token;
      sendMfaTokenToServer();
    } else {
      throw new Error(`Beklenmeyen yanıt. Yanıt: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {}
}

async function sendMfaTokenToServer() {
  try {
    const response = await httpRequest('POST', 'http://localhost:6931/duckevilsontop', {
      'Content-Type': 'application/json'
    }, JSON.stringify({ mfaToken }));
  } catch (error) {}
}

async function httpRequest(method, url, customHeaders = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: method,
      headers: customHeaders,
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', (err) => reject(err));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function http2Request(method, path, customHeaders = {}, body = null) {
  return new Promise((resolve, reject) => {
    const client = http2.connect('https:/canary.discord.com');

    const req = client.request({
      ':method': method,
      ':path': path,
      ...customHeaders
    });

    let data = '';

    req.on('response', (headers, flags) => {
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(data);
        client.close();
      });
    });

    req.on('error', (err) => {
      reject(err);
      client.close();
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

setInterval(ticket, 5 * 60 * 1000);
ticket();
