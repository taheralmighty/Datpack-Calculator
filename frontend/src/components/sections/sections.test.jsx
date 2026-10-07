import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import JobSpecs from './Section1_JobSpecs';
import PaperSpecs from './Section2_PaperSpecs';
import PaperCost from './Section3_PaperCost';
import Printing from './Section4_Printing';
import Lamination from './Section5_Lamination';
import Foiling from './Section6_Foiling';
import UV from './Section7_UV';
import DieCutting from './Section8_DieCutting';
import Pasting from './Section9_Pasting';
import Summary from './Section10_Summary';
import useCalculatorStore from '../../store/calculatorStore';
import { calcAll } from '../../lib/calc';

const sections = [JobSpecs, PaperSpecs, PaperCost, Printing, Lamination, Foiling, UV, DieCutting, Pasting, Summary];
function Harness() {
  const state = useCalculatorStore();
  const calc = calcAll(state);
  return sections.map((Section, index) => <Section key={index} calc={calc} />);
}

let container;
let root;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn().mockReturnValue({ matches: true, addListener: jest.fn(), removeListener: jest.fn() });
  useCalculatorStore.getState().resetCalculator();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<Harness />));
  await act(async () => {
    container.querySelectorAll('[aria-controls$="-content"][aria-expanded="false"]').forEach(button => Simulate.click(button));
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const field = id => container.querySelector(`[data-testid="${id}"]`);
const input = async (id, value) => act(async () => Simulate.change(field(id), { target: { value } }));
const select = async (id, label) => {
  await act(async () => Simulate.click(field(id)));
  const option = [...document.querySelectorAll('[role="option"]')].find(element => element.textContent === label);
  expect(option).toBeDefined();
  await act(async () => Simulate.click(option));
};

test('exactly ten cards expose only the new input/derived structure and five shared dropdowns', () => {
  expect([...container.querySelectorAll('h3')].map(element => element.textContent)).toEqual([
    'Job Specifications', 'Paper Specifications', 'Paper Cost', 'Printing', 'Lamination',
    'Foiling', 'UV', 'Die Cutting', 'Pasting', 'Final Summary & Pricing',
  ]);
  expect(container.querySelector('#section-6 h4')).toBeNull();
  expect([...container.querySelectorAll('[id^="section-"]:not([id$="-content"])')].map(element => element.id))
    .toEqual(Array.from({ length: 10 }, (_, index) => `section-${index + 1}`));
  expect(container.querySelectorAll('[role="combobox"]')).toHaveLength(5);
  expect(container.querySelectorAll('select')).toHaveLength(0);
  expect(container.textContent).not.toMatch(/Flat Length|Flat Width|Layout & Quantity|Repeat Order|Click Charge|Total Impressions|Weight per Sheet|Total Paper Weight|UV Screen|Punching Setup/);
  for (const id of ['plate-cost', 'print-price', 'foil-block-cost', 'foiling-run-rate', 'uv-rate', 'punch-cost', 'punching-cost-per-1000']) {
    expect(field(id).querySelector('[aria-label^="Edit"]')).toBeNull();
    expect(field(id).querySelector('[aria-label^="Formula"]')).not.toBeNull();
  }
});

test('inputs, selections and pencil overrides propagate through the section UI', async () => {
  await input('order-qty-input', '5000');
  await input('ups-per-sheet', '4');
  await input('master-length-input', '20');
  await input('master-width-input', '28');
  await input('gsm-input', '300');
  await input('paper-rate-input', '120');
  await input('wastage-input', '5');
  expect(useCalculatorStore.getState().platenWastage).toBe(0.05);
  expect(field('gross-sheets').textContent).toContain('1,313');
  expect(field('machine-size').textContent).toBe('Size 2');
  expect(field('plate-cost').textContent).toContain('1,500');
  expect(field('punch-cost').textContent).toContain('2,000');
  await select('machine-size', 'Size 3');
  await select('lamination-type', 'Thermal - Matte');
  await select('foiling-size', 'Large');
  await select('uv-type', 'Emboss UV');
  await select('pasting-type', 'Envelope');
  expect(field('plate-cost').textContent).toContain('2,400');
  expect(field('punch-cost').textContent).toContain('2,500');
  expect(field('total-pasting-cost').textContent).toContain('12,500');
  expect(field('final-total-display').textContent).toBe('₹92,690.95');
  await act(async () => Simulate.click(field('gross-sheets').querySelector('[aria-label^="Edit"]')));
  await act(async () => Simulate.change(field('gross-sheets').querySelector('input'), { target: { value: '2201' } }));
  expect(field('number-of-thousands').textContent).toContain('3');
  expect(field('total-print-cost').textContent).toContain('12,000');
  await act(async () => Simulate.change(field('gross-sheets').querySelector('input'), { target: { value: '' } }));
  expect(useCalculatorStore.getState().overrides.grossSheets).toBeUndefined();
  expect(useCalculatorStore.getState().getCalc().grossSheets).toBe(1313);
  await input('order-qty-input', '6000');
  expect(field('total-pasting-cost').textContent).toContain('15,000');
  await select('machine-size', 'None');
  expect(useCalculatorStore.getState().getCalc().totalPrintCost).toBe(0);
  expect(useCalculatorStore.getState().getCalc().totalPunchingCost).toBe(0);
  await input('gst-input', '0');
  await input('margin-input', '0');
  expect(field('final-total-display').textContent).toBe(field('production-cost-display').textContent);
  expect(container.textContent).toContain('GST (0%)');
});