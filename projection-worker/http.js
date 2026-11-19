import { createServer } from 'node:http';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { syncRequestedViews } from './run.mjs';

initializeApp({projectId:'omniplay-op'});
const db = getFirestore();
let queue = Promise.resolve();
const origin = 'https://gb168168.github.io';
createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url !== '/sync' || req.headers.origin !== origin) return res.writeHead(403).end();
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return res.writeHead(405).end();
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return res.writeHead(401).end();
  let user;
  try { user = await getAuth().verifyIdToken(token, true); }
  catch { return res.writeHead(401).end(); }
  try {
    const [profile, access] = await db.getAll(db.doc('omniplay-member-access/'+user.uid),db.doc('omniplay-security/access'));
    const admin = profile.get('enabled') === true && profile.get('role') === 'admin' && profile.get('groupName') === 'OMNIPLAY Support';
    if (!admin && access.get('ownerUid') !== user.uid) return res.writeHead(403).end();
    const current = queue.then(() => syncRequestedViews(db));
    queue = current.catch(() => {});
    await current;
    res.writeHead(204).end();
  } catch { res.writeHead(503).end(); }
}).listen(Number(process.env.PORT || 8080), process.env.HOST || '127.0.0.1');
