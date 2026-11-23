import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../_worker.js', import.meta.url), 'utf8');
const uuid = '00000000-0000-4000-a000-000000000000';
const pin = 'a1'.repeat(32);
const realityKey = 'A'.repeat(43);
const fixtures = [
  `vless://${uuid}@reality.example:443?security=reality&type=tcp&flow=xtls-rprx-vision&fp=chrome&sni=front.example&pbk=${realityKey}&sid=1234#same`,
  `vless://${uuid}@ws.example:443?security=tls&type=ws&flow=none&host=app.example&path=%2Fws&sni=app.example&ech=ech.example%2Bhttps%3A%2F%2F1.1.1.1%2Fdns-query#same`,
  `hysteria2://secret@hy.example:443?insecure=1&pinSHA256=${pin}&mport=21000-21999%2C22000&sni=hy.example&obfs=salamander&obfs-password=mask#hy`,
  'tuic://00000000-0000-4000-a000-000000000000:pass@tuic.example:443?alpn=h3&congestion_control=cubic#tuic',
  'anytls://pass@any.example:443?security=tls#any',
  'ss://' + Buffer.from('aes-128-gcm:pass').toString('base64url') + '@ss.example:8388#ss',
];
function request(query, { ua = 'v2rayN/7.25.6', upstream = fixtures.join('\n'), links = 'https://source.example/sub', remote } = {}) {
  const context = vm.createContext({
    console: {log(){}, warn(){}, error(){}}, Headers, Request, Response, URL, URLSearchParams,
    AbortController, AbortSignal, TextEncoder, TextDecoder, atob, btoa, clearTimeout, setTimeout,
    crypto: {subtle:{digest:async (algorithm,data)=>Uint8Array.from(createHash(algorithm).update(data).digest()).buffer}},
    fetch: async input => {
      const uri = new URL(typeof input === 'string' ? input : input.url);
      if (uri.hostname === 'source.example') {
        if (input.headers.get('User-Agent').toLowerCase().includes('mihomo') ||
            input.headers.get('User-Agent').toLowerCase().includes('sing-box')) return new Response('# incompatible upstream format');
        return new Response(upstream);
      }
      if (remote !== undefined) return new Response(remote);
      return new Response('upstream error', {status:502});
    },
  });
  vm.runInContext(source.replace('export default {', 'globalThis.worker = {'), context);
  return context.worker.fetch(new Request('https://aggregation.example/sub?token=test&'+query,{headers:{'User-Agent':ua}}),
    {TOKEN:'test',LINK:links}, {waitUntil(){}});
}
async function clashNodes(response) {
  const text = await response.text();
  const [, entries] = text.split('proxies:\n');
  assert.ok(entries, 'Expected YAML proxies section');
  return Array.from(entries.split('\nproxy-groups:', 1)[0].matchAll(/^  - (\{.*\})$/gm), match=>JSON.parse(match[1]));
}

test('clash returns YAML and preserves the five protocols and TLS transport options', async () => {
  const response=await request('clash');
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type'),/yaml/);
  const proxies=await clashNodes(response);
  assert.equal(proxies.length,6);
  assert.equal(new Set(proxies.map(n=>n.name)).size,6);
  assert.equal(proxies[0]['reality-opts']['public-key'],realityKey);
  assert.equal(proxies[0]['reality-opts']['short-id'],'1234');
  assert.equal(proxies[0]['client-fingerprint'],'chrome');
  assert.equal(proxies[1]['ws-opts'].headers.Host,'app.example');
  assert.equal(proxies[1]['ech-opts']['query-server-name'],'ech.example');
  assert.equal(proxies[2].fingerprint,pin);
  assert.equal(proxies[2].ports,'21000-21999,22000');
  assert.equal(proxies[2]['obfs-password'],'mask');
  assert.equal(proxies[3]['congestion-controller'],'cubic');
  assert.equal(proxies[4].type,'anytls');
  assert.equal(proxies[5].cipher,'aes-128-gcm');
});
test('sing-box stable keeps remaining outbounds without silently dropping certificate verification', async () => {
  const response=await request('sb',{ua:'sing-box/1.14.4'});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('X-Subscription-Skipped'),'1');
  assert.match(response.headers.get('X-Subscription-Warnings'),/certificate/);
  const config=await response.json();
  assert.equal(config.outbounds.filter(n=>n.server).length,5);
  assert.equal(config.outbounds.find(n=>n.server==='ws.example').tls.ech.query_server_name,'ech.example');
  assert.equal(config.dns.servers.find(n=>n.type==='https').server,'1.1.1.1');
  assert.equal(config.outbounds.find(n=>n.server==='reality.example').tls.reality.short_id,'1234');
  assert.equal(config.outbounds.find(n=>n.server==='tuic.example').congestion_control,'cubic');
});
test('sing-box 1.15+ retains whole-certificate pin and multi-port Hysteria2', async () => {
  const response=await request('sb&sb-version=1.15');
  assert.equal(response.status,200);
  const config=await response.json();
  const hy=config.outbounds.find(n=>n.type==='hysteria2');
  assert.deepEqual(hy.tls.certificate_sha256,[Buffer.from(pin,'hex').toString('base64')]);
  assert.deepEqual(hy.server_ports,['21000:21999','22000:22000']);
  assert.deepEqual(hy.obfs,{type:'salamander',password:'mask'});
});
test('Mihomo UA detects Clash and requests original URI upstream', async () => {
  const response=await request('',{ua:'mihomo/v1.19.20'});
  assert.equal(response.status,200);
  assert.equal((await clashNodes(response)).length,6);
});
test('an unconvertible subscription returns a clear non-200 and omits credentials from errors', async () => {
  const response=await request('clash',{links:'unknown://private-token@example.invalid:443#test'});
  assert.equal(response.status,422);
  const body=await response.text();
  assert.match(body,/unknown/);
  assert.doesNotMatch(body,/private-token/);
});
test('external format failures do not masquerade as Base64 for requesting clients', async () => {
  const response=await request('loon',{remote:'dGhpcyBpcyBub3QgYSBjb25maWc='});
  assert.equal(response.status,502);
  assert.match(await response.text(),/loon/i);
});
test('v2rayN raw subscription retains original node links', async () => {
  const response=await request('base64');
  assert.equal(response.status,200);
  assert.deepEqual(Buffer.from(await response.text(),'base64').toString().split('\n'),fixtures);
});
