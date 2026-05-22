/**
 * Tencent Cloud API 3.0 Signature (TC3-HMAC-SHA256)
 * Used to sign requests to Tencent Cloud TMT API from browser extensions.
 */

const ALGORITHM = 'TC3-HMAC-SHA256';

function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(message)).then((hash) =>
    Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  );
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer | Uint8Array, message: string): Promise<string> {
  const sig = await hmacSha256(key, message);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sign(
  secretKey: string,
  date: string,
  service: string,
  stringToSign: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const kDate = await hmacSha256(encoder.encode(`TC3${secretKey}`), date);
  const kService = await hmacSha256(kDate, service);
  const kSigning = await hmacSha256(kService, 'tc3_request');
  return hmacSha256Hex(kSigning, stringToSign);
}

export interface TmtRequest {
  action: string;
  params: Record<string, unknown>;
}

export interface TmtResponse {
  Response: {
    RequestId: string;
    Error?: { Code: string; Message: string };
  } & Record<string, unknown>;
}

export async function callTmtApi(
  secretId: string,
  secretKey: string,
  region: string,
  request: TmtRequest,
): Promise<TmtResponse['Response']> {
  const service = 'tmt';
  const host = 'tmt.tencentcloudapi.com';
  const version = '2018-03-21';
  const timestamp = Math.floor(Date.now() / 1000);
  const dateStr = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const payload = JSON.stringify(request.params);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';
  const hashedPayload = await sha256Hex(payload);
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

  const credentialScope = `${dateStr}/${service}/tc3_request`;
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = `${ALGORITHM}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const signature = await sign(secretKey, dateStr, service, stringToSign);

  const authorization = `${ALGORITHM} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: host,
      'X-TC-Action': request.action,
      'X-TC-Version': version,
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': region,
      Authorization: authorization,
    },
    body: payload,
  });

  const data: TmtResponse = await response.json();

  if (data.Response.Error) {
    throw new Error(`TMT Error [${data.Response.Error.Code}]: ${data.Response.Error.Message}`);
  }

  return data.Response;
}

/** Translate text from source language to target language */
export async function translateText(
  secretId: string,
  secretKey: string,
  region: string,
  sourceText: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const res = await callTmtApi(secretId, secretKey, region, {
    action: 'TextTranslate',
    params: {
      SourceText: sourceText,
      Source: sourceLang === 'auto' ? 'auto' : sourceLang,
      Target: targetLang,
      ProjectId: 0,
    },
  });
  return res.TargetText as string;
}

/** Batch translate multiple texts (max 10 per batch) */
export async function translateBatch(
  secretId: string,
  secretKey: string,
  region: string,
  sourceTexts: string[],
  sourceLang: string,
  targetLang: string,
): Promise<string[]> {
  const res = await callTmtApi(secretId, secretKey, region, {
    action: 'TextTranslateBatch',
    params: {
      SourceTextList: sourceTexts,
      Source: sourceLang === 'auto' ? 'auto' : sourceLang,
      Target: targetLang,
      ProjectId: 0,
    },
  });
  return (res.TargetTextList as string[]) ?? [];
}

/** Detect the language of a given text */
export async function detectLanguage(
  secretId: string,
  secretKey: string,
  region: string,
  text: string,
): Promise<{ lang: string; confidence: number }> {
  const res = await callTmtApi(secretId, secretKey, region, {
    action: 'LanguageDetect',
    params: {
      Text: text.slice(0, 1000),
      ProjectId: 0,
    },
  });
  return {
    lang: (res.Lang as string) ?? 'en',
    confidence: 1.0,
  };
}
