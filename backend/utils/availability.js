// Stockholm local time, including daylight-saving changes.
export const preparationMinutes = product => {
  const n = Number(product?.preparationMinutes ?? 0);
  return Number.isInteger(n) && n >= 0 && n <= 720 ? n : 0;
};
export const stockholmParts = (date = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}:${parts.second}` };
};
// Reserve 30 minutes for the existing Stripe checkout expiry window.
// Made-to-order deliveries receive an additional 60-minute delivery buffer.
export const slotFits = (date, slot, minutes, method, now = new Date()) => {
  const buffer = minutes > 0 ? 30 + (method === 'delivery' ? 60 : 0) : 0;
  const ready = stockholmParts(new Date(now.getTime() + (minutes + buffer) * 60000));
  return `${date}T${slot.split('-')[0]}:00` > `${ready.date}T${ready.time}`;
};
