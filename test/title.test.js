import test from 'node:test'; import assert from 'node:assert/strict';
const extractUrl = body => { const v=body.trim(); if (!v.toLowerCase().startsWith('http://') && !v.toLowerCase().startsWith('https://')) return null; if (v.includes(' ')) return null; try { return new URL(v).href; } catch { return null; } };
const hostname = url => { const h=new URL(url).hostname.toLowerCase(); return h.startsWith('www.') ? h.slice(4) : h; };
const cleanTitle = v => v.replace(/\s+/g,' ').replace(/[\\/:#?%*|<>"\x00-\x1f]/g,' ').trim().replace(/\s+/g,' ').slice(0,180);
test('accepts exactly one URL with whitespace', () => assert.equal(extractUrl('  https://www.docs.example.com/a  '), 'https://www.docs.example.com/a'));
test('rejects additional content and malformed URLs', () => { assert.equal(extractUrl('https://example.com more'), null); assert.equal(extractUrl('not a url'), null); });
test('normalizes host and title', () => { assert.equal(hostname('https://WWW.Example.com/x'), 'example.com'); assert.equal(cleanTitle(' A B:/C '), 'A B C'); });
