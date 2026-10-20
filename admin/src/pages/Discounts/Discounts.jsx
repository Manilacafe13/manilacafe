import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Discounts.css';

const initialForm = {
  code: '', type: 'fixed', value: '', minOrderAmount: '0',
  usageLimit: '1', expiresAt: ''
};

const Discounts = ({ url }) => {
  const [form, setForm] = useState(initialForm);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${url}/api/discount/list`, { headers: authHeaders() });
      if (!response.data.success) throw new Error(response.data.message || 'Kunde inte läsa rabattkoder.');
      setDiscounts(response.data.discounts || []);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte hämta rabattkoder.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { loadDiscounts(); }, [loadDiscounts]);

  const createDiscount = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderAmount: Number(form.minOrderAmount || 0),
        usageLimit: form.usageLimit.trim() === '' ? null : Number(form.usageLimit),
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null
      };
      const response = await axios.post(`${url}/api/discount/create`, payload, { headers: authHeaders() });
      if (!response.data.success) throw new Error(response.data.message || 'Kunde inte skapa rabattkoden.');
      toast.success('Rabattkoden har skapats.');
      setForm(initialForm);
      await loadDiscounts();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte skapa rabattkoden.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDiscount = async (discount) => {
    if (busyId) return;
    setBusyId(discount._id);
    try {
      const response = await axios.patch(`${url}/api/discount/toggle/${discount._id}`, {}, { headers: authHeaders() });
      if (!response.data.success) throw new Error(response.data.message || 'Kunde inte uppdatera rabattkoden.');
      toast.success(response.data.message || 'Rabattkoden uppdaterades.');
      await loadDiscounts();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte uppdatera rabattkoden.');
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('sv-SE') : 'Ingen';
  const formatAmount = (value) => Number(value || 0).toLocaleString('sv-SE', { maximumFractionDigits: 2 });

  return (
    <section className="discounts-page">
      <h1>Rabattkoder</h1>
      <p>Skapa rabattkoder för kunder. Sätt användningsgränsen till 1 för en engångskod.</p>

      <form className="discounts-form" onSubmit={createDiscount}>
        <h2>Skapa rabattkod</h2>
        <div className="discounts-fields">
          <label>Kod
            <input required maxLength={50} pattern="[A-Za-z0-9_-]+" placeholder="TACK50" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          </label>
          <label>Typ
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="fixed">Fast belopp (kr)</option>
              <option value="percentage">Procent (%)</option>
            </select>
          </label>
          <label>Rabatt {form.type === 'fixed' ? '(kr)' : '(%)'}
            <input required type="number" min="0.01" max={form.type === 'percentage' ? '100' : undefined}
              step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </label>
          <label>Minsta produktbelopp inkl. moms (kr)
            <input type="number" min="0" step="0.01" value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
          </label>
          <label>Max antal användningar <small>(lämna tomt för obegränsat)</small>
            <input type="number" min="1" step="1" placeholder="Obegränsat" value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </label>
          <label>Giltig till <small>(valfritt)</small>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </label>
        </div>
        <button type="submit" disabled={saving}>{saving ? 'Skapar…' : 'Skapa rabattkod'}</button>
      </form>

      <div className="discounts-list">
        <div className="discounts-list-heading">
          <h2>Befintliga rabattkoder</h2>
          <button type="button" onClick={loadDiscounts} disabled={loading}>Uppdatera</button>
        </div>
        {loading ? <p>Hämtar rabattkoder…</p> : discounts.length === 0 ? <p>Inga rabattkoder skapade ännu.</p> : (
          <div className="discounts-table-wrap">
            <table>
              <thead><tr><th>Kod</th><th>Rabatt</th><th>Användningar</th><th>Giltig till</th><th>Status</th><th>Åtgärd</th></tr></thead>
              <tbody>{discounts.map((discount) => {
                const expired = discount.expiresAt && new Date(discount.expiresAt) <= new Date();
                const exhausted = discount.usageLimit != null &&
                  Number(discount.usedCount || 0) + Number(discount.reservedCount || 0) >= Number(discount.usageLimit);
                const status = !discount.isActive ? 'Inaktiv' : expired ? 'Utgången' : exhausted ? 'Fullbokad' : 'Aktiv';
                return (
                  <tr key={discount._id}>
                    <td><strong>{discount.code}</strong></td>
                    <td>{formatAmount(discount.value)} {discount.type === 'percentage' ? '%' : 'kr'}</td>
                    <td>{discount.usedCount || 0}{discount.reservedCount ? ` (+${discount.reservedCount} reserverade)` : ''} / {discount.usageLimit ?? '∞'}</td>
                    <td>{formatDate(discount.expiresAt)}</td>
                    <td>{status}</td>
                    <td><button type="button" disabled={Boolean(busyId)} onClick={() => toggleDiscount(discount)}>
                      {busyId === discount._id ? 'Sparar…' : discount.isActive ? 'Inaktivera' : 'Aktivera'}
                    </button></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default Discounts;
