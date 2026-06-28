import { useMemo } from 'react';
import type { ExpenseCategory } from '../types';
import { SearchSelect, type SearchSelectOption } from './financesSearchSelect';

const KIND_LABELS: Record<string, string> = {
  expense: 'Charges & dépenses',
  service: 'Services',
  extra: 'Extras locatifs',
};

export function groupExpenseCategories(categories: ExpenseCategory[]) {
  const byKind = new Map<string, ExpenseCategory[]>();
  for (const c of categories) {
    const kind = c.kind || 'expense';
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
      items: (byKind.get(k) || []).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }));
}

export function categoriesToSearchOptions(categories: ExpenseCategory[]): SearchSelectOption[] {
  const groups = groupExpenseCategories(categories);
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
};

export function CategorySelect({
  categories,
  value,
  onChange,
  required,
  placeholder = 'Choisir une catégorie…',
  disabled,
}: CategorySelectProps) {
  const options = useMemo(() => categoriesToSearchOptions(categories), [categories]);

  if (!categories.length) {
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
      placeholder={placeholder}
      searchPlaceholder="Internet, électricité, loyer…"
      emptyMessage="Aucune catégorie — essayez un autre mot-clé"
      onChange={(id) => onChange(id, categories.find((c) => c._id === id))}
    />
  );
}

export function categoryNameById(categories: ExpenseCategory[], id?: string): string {
  if (!id) return '—';
  return categories.find((c) => c._id === id)?.name || '—';
}
