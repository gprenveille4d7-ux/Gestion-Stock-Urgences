import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { REFERENCE_ITEMS, SMUR_CONTAINERS } from '../src/data/reference.js';
import { SOURCE_DOCUMENTS } from '../src/data/source-manifest.js';

const snapshot = JSON.parse(await readFile(
  new URL('../src/data/source-line-snapshot.json', import.meta.url),
  'utf8',
));
const chariotReference = JSON.parse(await readFile(
  new URL('../src/data/chariot-reference.json', import.meta.url),
  'utf8',
));

const ACTIVE_SOURCE_STATUS = 'imported-from-source';
const CHARIOT_MANIFEST_SOURCE = Object.freeze({
  'chariot-pediatrique': 'src-chariots-pedia',
  'chariot-box-4': 'src-chariot-box4',
  'chariot-box-3': 'src-chariot-box3',
});

function groupBy(values, keyOf) {
  const groups = new Map();
  for (const value of values) {
    const key = keyOf(value);
    const group = groups.get(key) || [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

test('le snapshot couvre les 16 documents actifs avec leur identité documentaire exacte', () => {
  const activeDocuments = SOURCE_DOCUMENTS.filter((document) => document.status === ACTIVE_SOURCE_STATUS);
  assert.equal(activeDocuments.length, 16);
  assert.equal(snapshot.documents.length, activeDocuments.length);
  assert.equal(new Set(snapshot.documents.map((document) => document.sourceId)).size, snapshot.documents.length);

  for (const source of activeDocuments) {
    const captured = snapshot.documents.find((document) => document.sourceId === source.id);
    assert.ok(captured, `document source absent du snapshot : ${source.id}`);
    assert.equal(captured.fileName, source.fileName);
    assert.equal(captured.sha256, source.sha256);
    assert.equal(captured.documentRef, source.documentRef ?? null);
    assert.equal(captured.revision, source.revision ?? null);
    assert.equal(captured.sourceDate, source.sourceDate ?? null);
    assert.ok(captured.referenceId, `référentiel absent pour ${source.id}`);
  }

  assert.equal(snapshot.summary.documents, 16);
});

test('chaque ligne source possède un identifiant stable, un localisateur et une quantité non inventée', () => {
  const knownSources = new Set(snapshot.documents.map((document) => document.sourceId));
  assert.equal(snapshot.lines.length, 725);
  assert.equal(new Set(snapshot.lines.map((line) => line.id)).size, snapshot.lines.length);
  assert.equal(new Set(snapshot.lines.map((line) => line.sourceRowId)).size, 661);

  for (const line of snapshot.lines) {
    assert.match(line.id, /^[a-z0-9][a-z0-9:-]+$/);
    assert.ok(knownSources.has(line.sourceId), `source inconnue : ${line.id}`);
    assert.ok(['pdf', 'xlsx'].includes(line.sourceType));
    assert.ok(typeof line.locator === 'string' && line.locator.length > 0);
    assert.ok(typeof line.section === 'string' && line.section.length > 0);
    assert.ok(typeof line.rawText === 'string' && line.rawText.length > 0);
    assert.ok(line.sourceQuantity === null || (Number.isFinite(line.sourceQuantity) && line.sourceQuantity >= 0));

    for (const forbidden of ['lot', 'lotNumber', 'expiry', 'expiryDate', 'user', 'presentQuantity']) {
      assert.equal(Object.hasOwn(line, forbidden), false, `${line.id} contient une donnée de stock vivant`);
    }

    if (line.parseStatus === 'source-zero') {
      assert.equal(line.sourceQuantity, 0);
      assert.equal(line.expectedQuantity, null);
      assert.equal(line.referenceItemId, null);
    } else {
      assert.ok(Number.isFinite(line.expectedQuantity) && line.expectedQuantity > 0, line.id);
      assert.ok(line.referenceItemId, line.id);
    }
  }

  assert.deepEqual(snapshot.summary, {
    documents: 16,
    pdfSourceAtoms: 362,
    pdfReferenceItems: 361,
    pdfSections: 39,
    xlsxPositiveLines: 357,
    xlsxZeroAnnotations: 6,
    activeReferenceLines: 718,
    activeExpectedUnits: 1277,
  });
});

test('les 361 lignes PDF restent toutes visibles et leurs quantités se réconcilient avec la source', () => {
  const pdfLines = snapshot.lines.filter((line) => line.sourceType === 'pdf');
  const linesByReferenceItem = groupBy(pdfLines, (line) => line.referenceItemId);
  assert.equal(pdfLines.length, 362);
  assert.equal(linesByReferenceItem.size, REFERENCE_ITEMS.length);
  assert.equal(REFERENCE_ITEMS.length, 361);

  for (const item of REFERENCE_ITEMS) {
    const sourceLines = linesByReferenceItem.get(item.id);
    assert.ok(sourceLines?.length, `ligne PDF absente : ${item.id}`);
    assert.ok(sourceLines.every((line) => line.sourceId === item.sourceId));
    assert.equal(
      sourceLines.reduce((total, line) => total + line.expectedQuantity, 0),
      item.expectedQuantitySource,
      `quantité non réconciliée : ${item.id}`,
    );
  }

  for (const container of SMUR_CONTAINERS) {
    assert.ok(container.sections.length > 0, `${container.id} ne contient aucune section`);
    for (const section of container.sections) {
      assert.ok(section.items.length > 0, `${section.id} est vide`);
      assert.ok(section.items.every((item) => Number.isFinite(item.expectedQuantity) && item.expectedQuantity > 0));
    }
  }
});

test('les quantités relues par l’utilisateur restent traçables sans modifier le snapshot source', () => {
  const corrected = REFERENCE_ITEMS.filter((item) => item.quantityStatus === 'user-corrected');
  assert.equal(corrected.length, 9);
  assert.ok(corrected.every((item) => item.sectionId === 'sac-rouge-solutes:ampoulier-interne'));
  assert.ok(corrected.every((item) => item.expectedQuantity !== item.expectedQuantitySource));
});

test('les libellés PDF ambigus restent littéraux et localement signalés', () => {
  const bicarbonates = snapshot.lines.filter((line) =>
    line.sourceType === 'pdf'
    && /BICARBONATE(?: DE SODIUM)? 42\s*%/i.test(line.rawText)
    && line.parseStatus === 'source-ambiguity-to-validate',
  );
  assert.equal(bicarbonates.length, 2);
  assert.ok(bicarbonates.every((line) => line.parseStatus === 'source-ambiguity-to-validate'));

  const pinkNeedles = snapshot.lines.filter((line) =>
    line.sourceId === 'src-fibrinolyse' && line.rawText === '2 x AIGUILLES ROSES',
  );
  assert.equal(pinkNeedles.length, 2);
  assert.equal(new Set(pinkNeedles.map((line) => line.sourceRowId)).size, 2);
  assert.equal(new Set(pinkNeedles.map((line) => line.referenceItemId)).size, 1);
  assert.equal(pinkNeedles.reduce((total, line) => total + line.expectedQuantity, 0), 4);
  assert.ok(pinkNeedles.every((line) => line.parseStatus === 'duplicate-source-row'));

  const implicitQuantities = snapshot.lines.filter((line) => line.sourceQuantity === null);
  assert.ok(implicitQuantities.length > 0);
  assert.ok(implicitQuantities.every((line) => line.parseStatus !== 'exact'));
});

test('les 357 lignes XLSX positives correspondent au référentiel importé cellule par cellule', () => {
  const xlsxLines = snapshot.lines.filter((line) =>
    line.sourceType === 'xlsx' && line.parseStatus !== 'source-zero',
  );
  const linesByReferenceItem = new Map(xlsxLines.map((line) => [line.referenceItemId, line]));
  assert.equal(xlsxLines.length, 357);
  assert.equal(linesByReferenceItem.size, xlsxLines.length);

  let importedCount = 0;
  for (const reference of chariotReference.references) {
    const manifestSourceId = CHARIOT_MANIFEST_SOURCE[reference.id];
    assert.ok(manifestSourceId, `liaison manifest absente : ${reference.id}`);
    for (const container of reference.containers) {
      assert.ok(container.items.length > 0, `${container.id} est vide`);
      for (const item of container.items) {
        importedCount += 1;
        const line = linesByReferenceItem.get(item.id);
        assert.ok(line, `cellule XLSX absente : ${item.id}`);
        assert.equal(line.sourceId, manifestSourceId);
        assert.equal(line.cell, item.sourceCell);
        assert.equal(line.section, container.label);
        assert.equal(line.rawText, item.label);
        assert.equal(line.sourceQuantity, item.expectedQuantity);
        assert.equal(line.expectedQuantity, item.expectedQuantity);
      }
    }
  }
  assert.equal(importedCount, 357);
});

test('les six lignes XLSX à quantité zéro restent visibles sans stock théorique inventé', () => {
  const zeroLines = snapshot.lines.filter((line) => line.parseStatus === 'source-zero');
  const expected = new Map([
    ['B18', 'BOCAL A ASPIRATION'],
    ['B19', 'MANOMETRE SOUS VIDE'],
    ['B20', 'TUBULURE'],
    ['B21', 'STOP VIDE'],
    ['B28', 'GARROT TOURNIQUET)'],
    ['B31', 'Stethoscope'],
  ]);

  assert.equal(zeroLines.length, expected.size);
  for (const line of zeroLines) {
    assert.equal(line.sourceId, 'src-chariots-pedia');
    assert.equal(line.section, 'Tiroir 5 RESERVE');
    assert.equal(line.rawText, expected.get(line.cell));
    assert.equal(line.sourceQuantity, 0);
    assert.equal(line.expectedQuantity, null);
  }
});

test('les référentiels actifs nécessaires à la consultation restent préchargés hors ligne', async () => {
  const serviceWorker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  for (const asset of [
    './src/data/reference.js',
    './src/data/source-manifest.js',
    './src/data/chariot-reference.json',
    './src/data/visual-schemas.js',
  ]) {
    assert.ok(serviceWorker.includes(`'${asset}'`), `asset hors-ligne absent : ${asset}`);
  }
});
