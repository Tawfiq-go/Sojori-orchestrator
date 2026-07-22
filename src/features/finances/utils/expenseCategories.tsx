import { useMemo } from 'react';
import type { ExpenseCategory } from '../types';
import { SearchSelect, type SearchSelectOption } from './financesSearchSelect';

const KIND_LABELS: Record<string, string> = {
  expense: 'Charges & dépenses',
  service: 'Services (marge guest)',
  extra: 'Extras locatifs',
};

/** Priorité d’affichage dans Charges (ex. Ménage avant Internet…). */
const EXPENSE_NAME_PRIORITY = ['ménage', 'ménage checkout', 'internet', 'électricité', 'eau', 'autre'];

function expenseSortKey(name: string): [number, string] {
  const n = name.trim().toLowerCase();
  const idx = EXPENSE_NAME_PRIORITY.indexOf(n);
  return [idx === -1 ? 999 : idx, n];
}

export function groupExpenseCategories(
  categories: ExpenseCategory[],
  kinds?: Array<'expense' | 'extra' | 'service'>,
) {
  const allowed = kinds?.length ? new Set(kinds) : null;
  const byKind = new Map<string, ExpenseCategory[]>();
  for (const c of categories) {
    const kind = (c.kind || 'expense') as 'expense' | 'extra' | 'service';
    if (allowed && !allowed.has(kind)) continue;
    const list = byKind.get(kind) || [];
    list.push(c);
    byKind.set(kind, list);
  }
  const order = ['expense', 'service', 'extra'];
  return order
    .filter((k) => byKind.has(k))
    .map((k) => ({
      kind: k,
      label: KIND_LABELS[k] || k,
      items: (byKind.get(k) || []).sort((a, b) => {
        const [pa, sa] = expenseSortKey(a.name);
        const [pb, sb] = expenseSortKey(b.name);
        if (pa !== pb) return pa - pb;
        return sa.localeCompare(sb, 'fr');
      }),
    }));
}

export function categoriesToSearchOptions(
  categories: ExpenseCategory[],
  kinds?: Array<'expense' | 'extra' | 'service'>,
): SearchSelectOption[] {
  const groups = groupExpenseCategories(categories, kinds);
  const out: SearchSelectOption[] = [];
  for (const g of groups) {
    for (const c of g.items) {
      out.push({
        value: c._id,
        label: c.name,
        group: g.label,
      });
    }
  }
  return out;
}

type CategorySelectProps = {
  categories: ExpenseCategory[];
  value: string;
  onChange: (id: string, category?: ExpenseCategory) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Filtre par kind — pour une dépense / récurrence : `['expense']` (exclut « Ménage payant »). */
  kinds?: Array<'expense' | 'extra' | 'service'>;
  error?: string;
};

export function CategorySelect({
  categories,
  value,
  onChange,
  required,
  placeholder = 'Choisir une catégorie…',
  disabled,
  kinds,
  error,
}: CategorySelectProps) {
  const options = useMemo(() => categoriesToSearchOptions(categories, kinds), [categories, kinds]);
  const filteredCats = useMemo(() => {
    if (!kinds?.length) return categories;
    const allow = new Set(kinds);
    return categories.filter((c) => allow.has((c.kind || 'expense') as 'expense' | 'extra' | 'service'));
  }, [categories, kinds]);

  if (!filteredCats.length) {
    return (
      <div className="inote warn" style={{ margin: 0 }}>
        <span className="i">⚠️</span>
        Aucune catégorie chargée — vérifiez le propriétaire PM en haut de page, puis rechargez.
      </div>
    );
  }

  return (
    <SearchSelect
      options={options}
      value={value}
      required={required}
      disabled={disabled}
      error={error}
      showCheck
      placeholder={placeholder}
      searchPlaceholder="Ménage, internet, électricité…"
      emptyMessage="Aucune catégorie — essayez « ménage »"
      onChange={(id) => onChange(id, filteredCats.find((c) => c._id === id))}
    />
  );
}

export function categoryNameById(categories: ExpenseCategory[], id?: string): string {
  if (!id) return '—';
  return categories.find((c) => c._id === id)?.name || '—';
}
