import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => fs.readFileSync(path.join(here, rel), 'utf8');
const block = read('TaskOrderBlock.tsx') + read('taskPaymentMeta.ts');
const drawer = read('TaskDetailDrawer.tsx');
const page = read('../../../pages/TasksListPage.tsx');
const mapper = read('../../../utils/fulltaskMappers.ts');
const cell = read('../../../components/tasks/TaskPlannedCell.tsx');

describe('Tasks — order summary, payment follow-up, start time', () => {
  it('the drawer shows a common order block (items, total, hour, payment) for every type', () => {
    assert.match(drawer, /<TaskOrderBlock task=\{task\}/);
    assert.match(block, /data-testid="task-order-block"/);
    assert.match(block, /updateTaskPayment\(task\._id/);
    for (const label of ['Payé', 'Partiel…', 'À régler sur place', 'Carte TPE', 'Carte en ligne', 'Sur la note']) {
      assert.ok(block.includes(label), label);
    }
  });
  it('the list gets a Paiement column and a working payment filter', () => {
    assert.match(page, /key: 'payment',\n\s+label: 'Paiement'/);
    assert.match(page, /matchesPaymentFilter\(task, listFilters\.paymentStatus\)/);
    assert.match(page, /value: 'to_collect'/);
    assert.doesNotMatch(page, /<MenuItem value="NOT_REQUIRED">/);
  });
  it('the subtitle and the planned hour come from `order` for room service, transport, experiences', () => {
    assert.match(mapper, /const orderLine = order\?\.summary/);
    assert.match(mapper, /conciergeDetailLine: detailLine/);
    assert.match(mapper, /plannedTime: plannedTime \?\? orderPlannedTime/);
    assert.match(page, /const label = task\.order\?\.startLabel;/);
    assert.match(cell, /\$\{m\[1\]\}h\$\{m\[2\]\}/);
  });
  it('a WhatsApp task is no longer labelled « Manuel » in the drawer', () => {
    assert.match(drawer, /task\.source === 'whatsapp'\n\s+\? 'WhatsApp'/);
  });
});
