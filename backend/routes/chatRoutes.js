/** Manila Café support v2 – drop-in replacement for backend/routes/chatRoutes.js
 * Mount unchanged: app.use('/api/chat', makeChatRouter({mongoose, staffAuth: requireAdmin}));
 * All opening-hour decisions are made on the server in Europe/Stockholm.
 */
import express from 'express';
import crypto from 'node:crypto';

const CATEGORIES = Object.freeze({
  order: 'Beställning', delivery: 'Leverans', pickup: 'Avhämtning', payment: 'Betalning',
  menu: 'Meny och produkter', allergy: 'Allergener', discount: 'Rabattkod',
  website: 'Hemsidan/tekniskt fel', complaint: 'Reklamation', other: 'Annat',
});
const REASONS = new Set(['delivery_cost', 'product_info', 'price', 'payment', 'just_browsing', 'other']);
const RESOLUTIONS = new Set(['resolved', 'follow_up', 'unresolved', 'sale', 'not_applicable']);
const clean = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const norm = v => String(v || '').toLocaleLowerCase('sv-SE').trim();
const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');

function stockholmParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const o = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { minutes: Number(o.hour) * 60 + Number(o.minute), day: `${o.year}-${o.month}-${o.day}` };
}
export function chatAvailability(date = new Date()) {
  const { minutes, day } = stockholmParts(date);
  return { isOpen: minutes >= 600 && minutes < 1380, timezone: 'Europe/Stockholm',
    hours: 'Alla dagar 10.00–23.00', localDate: day,
    offlineMessage: 'Tack för ditt meddelande! 💜 Vår livechatt är stängd just nu. Vi återkommer så snart vi kan under våra öppettider, alla dagar 10.00–23.00.' };
}

export function chatAutoAnswer(message) {
  const q = norm(message);
  const answer = (text, category = 'other', handoff = false) => ({ text, category, handoff });
  // Safety and urgent order issues first; never invent product allergen data or promises.
  if (/allerg|gluten|laktos|nöt|jordnöt|mjölkprotein|skaldjur|soja|ägg|sesam/.test(q))
    return answer('Allergier tar vi på största allvar 💜 Vilken produkt och vilket allergen gäller det? Jag lämnar frågan till personalen så att du får ett kontrollerat svar.', 'allergy', true);
  if (/fel var|sakna|uteblev|trasig|dålig|reklamation|klagomål|inte fått|inte kommit|försenad|sen leverans|fel i beställ/.test(q))
    return answer('Det vill vi lösa 💜 Beskriv gärna vad som hänt och skriv ditt ordernummer om du har det. Jag skickar ärendet vidare till personalen.', 'complaint', true);
  if (/människa|personal|medarbetare|riktig person|prata med någon|kundtjänst/.test(q))
    return answer('Självklart 💜 Skriv vad du behöver hjälp med så får personalen ditt ärende.', 'other', true);
  if (/rabatt|kod|kampanj|värdekod|kupong/.test(q))
    return answer('Rabattkoder anges i kassan på manilacafe.se. Om koden inte fungerar, skriv vilken kod du försökte använda så hjälper personalen dig. 💜', 'discount', true);
  if (/betala|betalning|klarna|billie|visa|mastercard|kort nek|kassan fungerar inte|stripe|swish/.test(q))
    return answer('Betalningen slutförs i kassan på hemsidan. Om något inte fungerar, beskriv felmeddelandet – men skicka aldrig kortuppgifter i chatten. Jag hjälper dig vidare. 💜', 'payment', true);
  if (/bugg|hemsid|laddar inte|tekniskt|felmeddelande|varukorg|kan inte beställa|checkout/.test(q))
    return answer('Tråkigt att hemsidan krånglar! 💜 Skriv vilken sida du är på, vad du försöker göra och vad som händer, så undersöker vi problemet.', 'website', true);
  if (/taho|halo.halo/.test(q))
    return answer('Taho och Halo-Halo erbjuds endast för avhämtning. 💜 Se aktuellt utbud på manilacafe.se. Vill du fråga om en specifik produkt kan jag skicka dig vidare.', 'menu', false);
  if (/lever|frakt|kör ni|partille|kungsbacka|göteborg|leveransområde|utkörning/.test(q))
    return answer('Vi levererar till Göteborg, Partille och Kungsbacka. 🚗 Exakt leveransmöjlighet och kostnad kontrollerar du genom att ange adressen i kassan på hemsidan.', 'delivery', false);
  if (/hämta|avhämtning|adress|var finns|mandolingatan|sittplats|äta hos er|bord/.test(q))
    return answer('Avhämtning sker på Mandolingatan 13 i Västra Frölunda. 📍 Vi har inga sittplatser – endast avhämtning och leverans. Du väljer alternativ i kassan.', 'pickup', false);
  if (/öppet|öppettid|när stänger|vilken tid/.test(q))
    return answer('Vi har öppet alla dagar kl. 10.00–23.00. 💜 Aktuella alternativ för beställning och avhämtning finns i kassan.', 'other', false);
  if (/meny|ube|sago|turon|pancit|adobo|sinigang|rekommender|vegetari|pris på|kostar/.test(q))
    return answer('Du hittar aktuellt utbud, priser och produktbeskrivningar på manilacafe.se. 🍰 Berätta gärna vad du gillar, eller skriv vilken produkt du undrar över!', 'menu', false);
  if (/beställ|order|köpa|förbeställ|boka/.test(q))
    return answer('Välj först dina produkter på manilacafe.se, lägg dem i varukorgen och välj avhämtning eller leverans i kassan. 💜 Om du fastnar hjälper vi gärna till.', 'order', false);
  return answer('Tack för din fråga! 💜 Jag vill inte gissa, så jag skickar den vidare till personalen. Beskriv gärna lite mer så kan vi hjälpa dig snabbare.', 'other', true);
}

function validatePhone(raw) {
  const number = clean(raw, 32).replace(/[\s()-]/g, '');
  if (!/^\+?\d{7,15}$/.test(number)) return null;
  return number;
}

export function makeChatRouter({ mongoose, staffAuth }) {
  if (typeof staffAuth !== 'function') throw new Error('Chat requires verified staffAuth.');
  const msgSchema = new mongoose.Schema({ role: { type: String, enum: ['customer', 'bot', 'staff'], required: true },
    text: { type: String, required: true, maxlength: 1000 }, at: { type: Date, default: Date.now } }, { _id: true });
  const schema = new mongoose.Schema({
    tokenHash: { type: String, required: true, select: false },
    customerName: { type: String, maxlength: 80 },
    customerPhone: { type: String, maxlength: 32, select: false },
    customerCategory: { type: String, enum: Object.keys(CATEGORIES), default: 'other' },
    category: { type: String, enum: Object.keys(CATEGORIES), default: null }, // staff-verified classification
    internalNote: { type: String, maxlength: 1500, default: '' },
    resolution: { type: String, enum: [...RESOLUTIONS], default: 'not_applicable' },
    status: { type: String, enum: ['bot', 'needs_staff', 'staff', 'closed'], default: 'bot' },
    channel: { type: String, enum: ['live', 'offline'], default: 'live' },
    lastOfflineNoticeDate: { type: String, default: '' },
    archivedAt: { type: Date, default: null }, closedAt: { type: Date, default: null },
    firstStaffReplyAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }, updatedAt: { type: Date, default: Date.now },
    lastMessageAt: { type: Date, default: Date.now },
    messages: { type: [msgSchema], default: [] },
    feedback: [{ reason: { type: String, enum: [...REASONS] }, at: { type: Date, default: Date.now } }],
  }, { minimize: true });
  schema.index({ lastMessageAt: -1 });
  schema.index({ archivedAt: 1, lastMessageAt: -1 });
  const Chat = mongoose.models.ManilaChatConversation || mongoose.model('ManilaChatConversation', schema);
  const router = express.Router();
  router.use(express.json({ limit: '16kb' }));
  const counters = new Map();
  const throttle = (req, res, next) => {
    const key = req.ip || 'unknown'; const now = Date.now();
    let w = counters.get(key);
    if (!w || w.reset < now) w = { count: 0, reset: now + 60000 };
    w.count++; counters.set(key, w);
    if (counters.size > 10000) for (const [ip, item] of counters) if (item.reset < now) counters.delete(ip);
    if (w.count > 70) return res.status(429).json({ error: 'För många förfrågningar. Försök igen snart.' });
    next();
  };
  const validId = id => mongoose.isValidObjectId(id);
  const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const customerView = (doc, schedule = chatAvailability()) => ({
    id: doc.id, status: doc.status, name: doc.customerName || '',
    category: doc.customerCategory || 'other', messages: doc.messages,
    archived: Boolean(doc.archivedAt), availability: schedule,
  });
  const authenticatedVisitor = wrap(async (req, res, next) => {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Inte hittad' });
    const token = req.get('X-Chat-Token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(403).json({ error: 'Ingen åtkomst' });
    const doc = await Chat.findById(req.params.id).select('+tokenHash');
    if (!doc || doc.tokenHash !== sha256(token)) return res.status(404).json({ error: 'Inte hittad' });
    req.conversation = doc; next();
  });
  const pushOfflineNotice = (doc, availability) => {
    if (doc.lastOfflineNoticeDate === availability.localDate) return;
    doc.messages.push({ role: 'bot', text: availability.offlineMessage });
    doc.lastOfflineNoticeDate = availability.localDate;
  };
  router.get('/availability', throttle, (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ ...chatAvailability(), categories: CATEGORIES });
  });
  router.post('/start', throttle, wrap(async (req, res) => {
    const name = clean(req.body?.name, 80);
    const phone = validatePhone(req.body?.phone);
    const category = clean(req.body?.category, 40) || 'other';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Ange ditt namn (minst 2 tecken).' });
    if (!phone) return res.status(400).json({ error: 'Ange ett giltigt telefonnummer.' });
    if (!(category in CATEGORIES)) return res.status(400).json({ error: 'Välj ett giltigt ärende.' });
    const availability = chatAvailability();
    const firstMessage = clean(req.body?.firstMessage, 1000);
    const token = newToken();
    const messages = [];
    let status = availability.isOpen ? 'bot' : 'needs_staff';
    if (availability.isOpen) messages.push({ role: 'bot', text: `Hej ${name}! 💜 Välkommen till Manila Café.` });
    if (firstMessage) {
      messages.push({ role: 'customer', text: firstMessage });
      if (availability.isOpen) {
        const answer = chatAutoAnswer(firstMessage);
        messages.push({ role: 'bot', text: answer.text });
        if (answer.handoff) status = 'needs_staff';
      }
    }
    if (!availability.isOpen) messages.push({ role: 'bot', text: availability.offlineMessage });
    const doc = await Chat.create({ tokenHash: sha256(token), customerName: name, customerPhone: phone,
      customerCategory: category, channel: availability.isOpen ? 'live' : 'offline', status,
      lastOfflineNoticeDate: availability.isOpen ? '' : availability.localDate,
      messages,
    });
    res.status(201).json({ ...customerView(doc, availability), token });
  }));
  router.get('/conversations/:id', throttle, authenticatedVisitor, wrap(async (req, res) => {
    res.set('Cache-Control', 'no-store').json(customerView(req.conversation));
  }));
  router.post('/conversations/:id/messages', throttle, authenticatedVisitor, wrap(async (req, res) => {
    const msg = clean(req.body?.text, 1000); const doc = req.conversation;
    if (!msg) return res.status(400).json({ error: 'Skriv ett meddelande.' });
    if (doc.archivedAt || doc.status === 'closed') return res.status(409).json({ error: 'Konversationen är avslutad. Starta en ny chatt.' });
    if (doc.messages.length >= 150) return res.status(409).json({ error: 'Konversationen är full. Kontakta personalen.' });
    const availability = chatAvailability();
    doc.messages.push({ role: 'customer', text: msg });
    if (!availability.isOpen) {
      doc.status = 'needs_staff'; pushOfflineNotice(doc, availability);
    } else if (doc.status === 'bot') {
      const answer = chatAutoAnswer(msg);
      doc.messages.push({ role: 'bot', text: answer.text });
      if (answer.handoff) doc.status = 'needs_staff';
    }
    doc.lastMessageAt = doc.updatedAt = new Date();
    await doc.save(); res.json(customerView(doc, availability));
  }));
  router.post('/conversations/:id/handoff', throttle, authenticatedVisitor, wrap(async (req, res) => {
    const doc = req.conversation;
    if (doc.archivedAt || doc.status === 'closed') return res.status(409).json({ error: 'Starta en ny chatt.' });
    const availability = chatAvailability();
    if (doc.status !== 'needs_staff') {
      doc.status = 'needs_staff';
      if (availability.isOpen) doc.messages.push({ role: 'bot', text: 'Självklart! 💜 Personalen har fått din fråga. Skriv gärna mer information här.' });
      else pushOfflineNotice(doc, availability);
      doc.updatedAt = new Date(); await doc.save();
    }
    res.json(customerView(doc, availability));
  }));
  router.post('/conversations/:id/feedback', throttle, authenticatedVisitor, wrap(async (req, res) => {
    const reason = clean(req.body?.reason, 30); const doc = req.conversation;
    if (!REASONS.has(reason)) return res.status(400).json({ error: 'Ogiltig anledning' });
    if (doc.feedback.length >= 2) return res.status(409).json({ error: 'Feedback redan mottagen' });
    doc.feedback.push({ reason }); await doc.save(); res.json({ ok: true });
  }));

  // Everything below this middleware requires the existing real admin authentication.
  const staff = express.Router(); staff.use(staffAuth);
  staff.get('/conversations', wrap(async (_req, res) => {
    const docs = await Chat.find().select('+customerPhone').sort({ lastMessageAt: -1 }).limit(300).lean();
    res.set('Cache-Control', 'no-store').json(docs);
  }));
  staff.post('/conversations/:id/reply', wrap(async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Inte hittad' });
    const text = clean(req.body?.text, 1000);
    if (!text) return res.status(400).json({ error: 'Skriv ett meddelande.' });
    if (!chatAvailability().isOpen) return res.status(409).json({ error: 'Livechatten öppnar kl. 10.00. Svara då.' });
    const doc = await Chat.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Inte hittad' });
    if (doc.archivedAt || doc.status === 'closed') return res.status(409).json({ error: 'Öppna ärendet innan du svarar.' });
    if (doc.messages.length >= 150) return res.status(409).json({ error: 'För många meddelanden.' });
    doc.messages.push({ role: 'staff', text }); doc.status = 'staff';
    if (!doc.firstStaffReplyAt) doc.firstStaffReplyAt = new Date();
    doc.updatedAt = doc.lastMessageAt = new Date(); await doc.save();
    res.json({ status: doc.status, messages: doc.messages });
  }));
  staff.patch('/conversations/:id', wrap(async (req, res) => {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Inte hittad' });
    const doc = await Chat.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Inte hittad' });
    const body = req.body || {};
    if (body.category !== undefined) {
      if (typeof body.category !== 'string' || !(body.category in CATEGORIES)) return res.status(400).json({ error: 'Ogiltig kategori.' });
      doc.category = body.category;
    }
    if (body.resolution !== undefined) {
      if (!RESOLUTIONS.has(body.resolution)) return res.status(400).json({ error: 'Ogiltigt resultat.' });
      doc.resolution = body.resolution;
    }
    if (body.internalNote !== undefined) {
      if (typeof body.internalNote !== 'string' || body.internalNote.length > 1500) return res.status(400).json({ error: 'Anteckningen är för lång.' });
      doc.internalNote = body.internalNote.trim();
    }
    if (body.status !== undefined) {
      if (!['bot', 'needs_staff', 'staff', 'closed'].includes(body.status)) return res.status(400).json({ error: 'Ogiltig status.' });
      doc.status = body.status;
      if (body.status === 'closed' && !doc.closedAt) doc.closedAt = new Date();
      if (body.status !== 'closed') doc.closedAt = null;
    }
    if (body.archived !== undefined) {
      if (typeof body.archived !== 'boolean') return res.status(400).json({ error: 'Ogiltig arkivering.' });
      if (body.archived) {
        if (!doc.category) return res.status(400).json({ error: 'Välj en problemkategori före arkivering.' });
        doc.status = 'closed'; doc.closedAt ||= new Date(); doc.archivedAt = new Date();
      } else {
        doc.archivedAt = null;
        if (doc.status === 'closed') doc.status = 'needs_staff';
        doc.closedAt = null;
      }
    }
    doc.updatedAt = new Date(); await doc.save();
    res.json({ ok: true, status: doc.status, category: doc.category, archivedAt: doc.archivedAt });
  }));
  // Active queue only: archived and closed conversations never count as pending.
  staff.get('/queue-count', wrap(async (_req, res) => {
    const active = await Chat.countDocuments({ archivedAt: null, status: { $ne: 'closed' } });
    res.set('Cache-Control', 'no-store').json({ active });
  }));
  staff.get('/insights', wrap(async (_req, res) => {
    const docs = await Chat.find().select('status archivedAt category customerCategory resolution feedback firstStaffReplyAt createdAt').lean();
    const reasons = Object.fromEntries([...REASONS].map(x => [x, 0]));
    const categories = Object.fromEntries(Object.keys(CATEGORIES).map(x => [x, 0]));
    const customerCategories = Object.fromEntries(Object.keys(CATEGORIES).map(x => [x, 0]));
    const outcomes = Object.fromEntries([...RESOLUTIONS].map(x => [x, 0]));
    let active = 0; let needsStaff = 0; let archived = 0; let answered = 0; let replyMs = 0;
    for (const doc of docs) {
      if (!doc.archivedAt && doc.status !== 'closed') active++;
      if (doc.status === 'needs_staff' && !doc.archivedAt) needsStaff++;
      if (doc.archivedAt) archived++;
      if (doc.category in categories) categories[doc.category]++;
      if (doc.customerCategory in customerCategories) customerCategories[doc.customerCategory]++;
      if (doc.resolution in outcomes) outcomes[doc.resolution]++;
      if (doc.firstStaffReplyAt && doc.createdAt) { answered++; replyMs += (new Date(doc.firstStaffReplyAt) - new Date(doc.createdAt)); }
      for (const f of doc.feedback || []) if (f.reason in reasons) reasons[f.reason]++;
    }
    res.json({ conversations: docs.length, active, needsStaff, archived, categories, customerCategories, outcomes, reasons,
      averageFirstReplyMinutes: answered ? Math.round(replyMs / answered / 60000) : null,
      labels: CATEGORIES });
  }));
  router.use('/staff', staff);
  router.use((err, _req, res, _next) => {
    console.error('Chat API error:', err?.message);
    res.status(500).json({ error: 'Något gick fel. Försök igen.' });
  });
  return router;
}
