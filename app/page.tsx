'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type Camp = { id: string; name: string; access_code: string };
type Category = { id: string; camp_id: string; name: string; planned_amount: number };
type Expense = { id: string; camp_id: string; category_id: string; date: string; amount: number; description: string; paid_by: string; receipt_number: string };

type ExpenseForm = Omit<Expense, 'id' | 'camp_id'>;

const money = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const today = new Date().toISOString().slice(0, 10);
const emptyExpense: ExpenseForm = { category_id: '', date: today, amount: 0, description: '', paid_by: '', receipt_number: '' };
const id = () => crypto.randomUUID();

export default function Home() {
  const [camp, setCamp] = useState<Camp | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [campName, setCampName] = useState('Camp été 2026');
  const [accessCode, setAccessCode] = useState('SCOUT2026');
  const [categoryName, setCategoryName] = useState('Alimentation');
  const [plannedAmount, setPlannedAmount] = useState(500);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpense);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [status, setStatus] = useState('Prêt à gérer le budget.');

  useEffect(() => {
    const saved = localStorage.getItem('scout-budget-state');
    if (saved) {
      const parsed = JSON.parse(saved) as { camp: Camp | null; categories: Category[]; expenses: Expense[] };
      setCamp(parsed.camp);
      setCategories(parsed.categories);
      setExpenses(parsed.expenses);
      setExpenseForm((form) => ({ ...form, category_id: parsed.categories[0]?.id ?? '' }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('scout-budget-state', JSON.stringify({ camp, categories, expenses }));
  }, [camp, categories, expenses]);

  const totals = useMemo(() => {
    const planned = categories.reduce((sum, category) => sum + Number(category.planned_amount), 0);
    const spent = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    return { planned, spent, left: planned - spent };
  }, [categories, expenses]);

  const categoryRows = useMemo(() => categories.map((category) => {
    const spent = expenses.filter((expense) => expense.category_id === category.id).reduce((sum, expense) => sum + Number(expense.amount), 0);
    const left = Number(category.planned_amount) - spent;
    const percent = category.planned_amount > 0 ? Math.min(100, Math.round((spent / category.planned_amount) * 100)) : 0;
    return { ...category, spent, left, percent };
  }), [categories, expenses]);

  const people = useMemo(() => Array.from(new Set(expenses.map((expense) => expense.paid_by).filter(Boolean))).sort(), [expenses]);
  const filteredExpenses = expenses.filter((expense) => (categoryFilter === 'all' || expense.category_id === categoryFilter) && (personFilter === 'all' || expense.paid_by === personFilter));

  async function createCamp(event: FormEvent) {
    event.preventDefault();
    const nextCamp = { id: id(), name: campName.trim(), access_code: accessCode.trim() };
    setCamp(nextCamp);
    setStatus(isSupabaseConfigured ? 'Camp créé localement, prêt pour synchronisation Supabase.' : 'Camp créé en stockage local. Configurez Supabase pour la persistance cloud.');
    if (supabase) await supabase.from('camps').upsert(nextCamp);
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    if (!camp || !categoryName.trim()) return;
    const category = { id: id(), camp_id: camp.id, name: categoryName.trim(), planned_amount: Number(plannedAmount) };
    setCategories((items) => [...items, category]);
    setExpenseForm((form) => ({ ...form, category_id: form.category_id || category.id }));
    setCategoryName('');
    setPlannedAmount(0);
    if (supabase) await supabase.from('budget_categories').upsert(category);
  }

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    if (!camp || !expenseForm.category_id) return;
    const expense = { ...expenseForm, id: editingId ?? id(), camp_id: camp.id, amount: Number(expenseForm.amount) };
    setExpenses((items) => editingId ? items.map((item) => item.id === editingId ? expense : item) : [expense, ...items]);
    setExpenseForm({ ...emptyExpense, category_id: categories[0]?.id ?? '' });
    setEditingId(null);
    if (supabase) await supabase.from('expenses').upsert(expense);
  }

  async function deleteExpense(expenseId: string) {
    setExpenses((items) => items.filter((expense) => expense.id !== expenseId));
    if (supabase) await supabase.from('expenses').delete().eq('id', expenseId);
  }

  function editExpense(expense: Expense) {
    setEditingId(expense.id);
    setExpenseForm({ category_id: expense.category_id, date: expense.date, amount: expense.amount, description: expense.description, paid_by: expense.paid_by, receipt_number: expense.receipt_number });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exportCsv() {
    const header = ['date', 'categorie', 'montant', 'description', 'personne', 'ticket'];
    const rows = expenses.map((expense) => [expense.date, categories.find((category) => category.id === expense.category_id)?.name ?? '', expense.amount, expense.description, expense.paid_by, expense.receipt_number]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `depenses-${camp?.name ?? 'camp'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-5 sm:px-6">
      <header className="mb-5 rounded-3xl bg-scout-700 p-5 text-white shadow-sm">
        <p className="text-sm uppercase tracking-[0.25em] text-scout-100">Budget camp scout</p>
        <h1 className="mt-2 text-3xl font-bold">Suivi simple des prévisions et dépenses</h1>
        <p className="mt-2 text-sm text-scout-100">Mobile-first, export CSV, persistance locale et connecteur Supabase.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Card title="1. Camp">
            <form onSubmit={createCamp} className="space-y-3">
              <Field label="Nom du camp" value={campName} onChange={setCampName} />
              <Field label="Code d’accès" value={accessCode} onChange={setAccessCode} />
              <button className="w-full rounded-2xl bg-scout-700 px-4 py-3 font-semibold text-white">Créer / ouvrir le camp</button>
              {camp && <p className="rounded-2xl bg-scout-50 p-3 text-sm">Camp actif : <strong>{camp.name}</strong> · code <strong>{camp.access_code}</strong></p>}
              <p className="text-xs text-slate-500">{status}</p>
            </form>
          </Card>

          <Card title="2. Catégories prévues">
            <form onSubmit={addCategory} className="grid gap-3 sm:grid-cols-[1fr_130px]">
              <Field label="Catégorie" value={categoryName} onChange={setCategoryName} />
              <NumberField label="Prévu (€)" value={plannedAmount} onChange={setPlannedAmount} />
              <button disabled={!camp} className="rounded-2xl bg-scout-700 px-4 py-3 font-semibold text-white disabled:bg-slate-300 sm:col-span-2">Ajouter la catégorie</button>
            </form>
          </Card>
        </div>

        <Card title={editingId ? 'Modifier une dépense' : 'Ajouter une dépense'}>
          <form onSubmit={saveExpense} className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Date<input type="date" className="mt-1 w-full rounded-2xl border p-3" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} /></label>
            <label className="text-sm font-medium">Catégorie<select className="mt-1 w-full rounded-2xl border p-3" value={expenseForm.category_id} onChange={(event) => setExpenseForm({ ...expenseForm, category_id: event.target.value })}><option value="">Choisir</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <NumberField label="Montant (€)" value={expenseForm.amount} onChange={(amount) => setExpenseForm({ ...expenseForm, amount })} />
            <Field label="Payé par" value={expenseForm.paid_by} onChange={(paid_by) => setExpenseForm({ ...expenseForm, paid_by })} />
            <Field label="N° ticket" value={expenseForm.receipt_number} onChange={(receipt_number) => setExpenseForm({ ...expenseForm, receipt_number })} />
            <label className="text-sm font-medium sm:col-span-2">Description<textarea className="mt-1 w-full rounded-2xl border p-3" value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} placeholder="Courses, essence, matériel..." /></label>
            <button disabled={!camp || !categories.length} className="rounded-2xl bg-amber-500 px-4 py-3 font-bold text-slate-950 disabled:bg-slate-300 sm:col-span-2">{editingId ? 'Enregistrer les modifications' : 'Ajouter la dépense'}</button>
          </form>
        </Card>
      </section>

      <section className="my-4 grid grid-cols-3 gap-3">
        <Kpi label="Prévu" value={money.format(totals.planned)} />
        <Kpi label="Dépensé" value={money.format(totals.spent)} />
        <Kpi label="Reste" value={money.format(totals.left)} tone={totals.left < 0 ? 'text-red-700' : 'text-scout-700'} />
      </section>

      <Card title="Tableau de bord par catégorie">
        <div className="space-y-3">{categoryRows.map((row) => <div key={row.id} className="rounded-2xl border p-3"><div className="flex items-center justify-between gap-2"><strong>{row.name}</strong><span className="text-sm">{row.percent}% consommé</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-scout-600" style={{ width: `${row.percent}%` }} /></div><p className="mt-2 text-sm text-slate-600">Prévu {money.format(row.planned_amount)} · Dépensé {money.format(row.spent)} · Reste {money.format(row.left)}</p></div>)}</div>
      </Card>

      <Card title="Dépenses">
        <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="rounded-2xl border p-3" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">Toutes les catégories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <select className="rounded-2xl border p-3" value={personFilter} onChange={(event) => setPersonFilter(event.target.value)}><option value="all">Toutes les personnes</option>{people.map((person) => <option key={person} value={person}>{person}</option>)}</select>
          <button onClick={exportCsv} className="rounded-2xl border border-scout-700 px-4 py-3 font-semibold text-scout-700">Export CSV</button>
        </div>
        <div className="space-y-3">{filteredExpenses.map((expense) => <article key={expense.id} className="rounded-2xl border bg-white p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{money.format(expense.amount)} · {categories.find((category) => category.id === expense.category_id)?.name}</p><p className="text-sm text-slate-600">{expense.date} · {expense.paid_by} · ticket {expense.receipt_number || '—'}</p><p className="mt-1">{expense.description}</p></div><div className="flex flex-col gap-2"><button className="rounded-xl bg-slate-100 px-3 py-2 text-sm" onClick={() => editExpense(expense)}>Modifier</button><button className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" onClick={() => deleteExpense(expense.id)}>Supprimer</button></div></div></article>)}</div>
      </Card>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100"><h2 className="mb-3 text-xl font-bold text-scout-900">{title}</h2>{children}</section>; }
function Kpi({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) { return <div className="rounded-3xl bg-white p-3 text-center shadow-sm"><p className="text-xs uppercase text-slate-500">{label}</p><p className={`mt-1 text-lg font-black ${tone}`}>{value}</p></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-medium">{label}<input className="mt-1 w-full rounded-2xl border p-3" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-sm font-medium">{label}<input type="number" min="0" step="0.01" className="mt-1 w-full rounded-2xl border p-3" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
