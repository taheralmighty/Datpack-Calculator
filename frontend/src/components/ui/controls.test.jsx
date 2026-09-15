import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import PremiumSelect from './PremiumSelect';
import AnimatedInput from './AnimatedInput';
import CalculatedEditableField from './CalculatedEditableField';
import SectionCard from './SectionCard';
import Dialog from './Dialog';

let container;
let root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn().mockReturnValue({ matches: true, addListener: jest.fn(), removeListener: jest.fn() });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test('select supports keyboard selection, escape, outside click and disabled state', async () => {
  const onChange = jest.fn();
  const render = disabled => act(() => root.render(<PremiumSelect label="Machine Size" options={{ size1: { label: 'Size 1' }, size2: { label: 'Size 2' } }} value="" onChange={onChange} disabled={disabled} />));
  render(false);
  const trigger = container.querySelector('[role="combobox"]');
  act(() => Simulate.keyDown(trigger, { key: 'ArrowDown' }));
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(document.querySelector('[role="listbox"]')).not.toBeNull();
  expect(container.querySelector('[role="listbox"]')).toBeNull();
  act(() => Simulate.keyDown(trigger, { key: 'End' }));
  await act(async () => Simulate.keyDown(trigger, { key: 'Enter' }));
  expect(onChange).toHaveBeenCalledWith('size2');
  act(() => Simulate.click(trigger));
  await act(async () => Simulate.keyDown(trigger, { key: 'Escape' }));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  act(() => Simulate.click(trigger));
  await act(async () => document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })));
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  render(true);
  expect(trigger.disabled).toBe(true);
});

test('calculated edit updates immediately, clear resets, escape restores, read-only has no pencil', async () => {
  const onOverride = jest.fn();
  const onReset = jest.fn();
  const render = editable => act(() => root.render(<CalculatedEditableField label="Gross Sheets" calculatedValue={1200} overrideValue={1300} formulaTooltip="RoundUp(Net Sheets)" onOverride={editable ? onOverride : undefined} onReset={editable ? onReset : undefined} />));
  render(true);
  act(() => Simulate.click(container.querySelector('[aria-label="Edit Gross Sheets"]')));
  const input = container.querySelector('input');
  act(() => Simulate.change(input, { target: { value: '2201' } }));
  expect(onOverride).toHaveBeenLastCalledWith(2201);
  act(() => Simulate.change(input, { target: { value: '' } }));
  expect(onReset).toHaveBeenCalled();
  act(() => Simulate.keyDown(input, { key: 'Escape' }));
  expect(onOverride).toHaveBeenLastCalledWith(1300);
  act(() => Simulate.click(container.querySelector('[aria-label="Reset Gross Sheets"]')));
  expect(onReset).toHaveBeenCalledTimes(2);
  await act(async () => Simulate.focus(container.querySelector('[aria-label="Formula for Gross Sheets"]')));
  expect(document.querySelector('[role="tooltip"]').textContent).toBe('RoundUp(Net Sheets)');
  render(false);
  expect(container.querySelector('[aria-label="Edit Gross Sheets"]')).toBeNull();
});

test('section preserves its own expand/collapse state', async () => {
  act(() => root.render(<SectionCard id="sample" title="Sample"><span>Content</span></SectionCard>));
  const header = container.querySelector('button');
  expect(header.getAttribute('aria-expanded')).toBe('false');
  act(() => Simulate.click(header));
  expect(header.getAttribute('aria-expanded')).toBe('true');
  await act(async () => Simulate.click(header));
  expect(header.getAttribute('aria-expanded')).toBe('false');
});

test('pointer hover and keyboard navigation have separate highlight states', async () => {
  const onChange = jest.fn();
  await act(async () => root.render(<PremiumSelect label="Machine Size" options={{ size1: { label: 'Size 1' }, size2: { label: 'Size 2' } }} value="size1" onChange={onChange} />));
  const trigger = container.querySelector('[role="combobox"]');
  await act(async () => Simulate.click(trigger));
  const options = document.querySelectorAll('[role="option"]');
  expect(document.querySelector('[role="option"][data-active="true"]')).toBeNull();
  await act(async () => Simulate.pointerMove(options[2]));
  expect(options[2].getAttribute('data-active')).toBe('false');
  expect(options[1].getAttribute('aria-selected')).toBe('true');
  await act(async () => Simulate.keyDown(trigger, { key: 'Home' }));
  expect(options[0].getAttribute('data-active')).toBe('true');
  await act(async () => Simulate.pointerMove(options[2]));
  expect(options[0].getAttribute('data-active')).toBe('false');
  await act(async () => Simulate.keyDown(trigger, { key: 'Enter' }));
  expect(onChange).toHaveBeenCalledWith('size2');
});

test('wheel leaves numeric input values unchanged and does not cancel scrolling', async () => {
  const onChange = jest.fn();
  await act(async () => root.render(<AnimatedInput label="Quantity" type="number" value="5000" onChange={onChange} />));
  const input = container.querySelector('input');
  await act(async () => input.focus());
  expect(document.activeElement).toBe(input);
  const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 });
  await act(async () => input.dispatchEvent(wheel));
  expect(document.activeElement).not.toBe(input);
  expect(input.value).toBe('5000');
  expect(onChange).not.toHaveBeenCalled();
  expect(wheel.defaultPrevented).toBe(false);
});

test('wheel exits pencil editing without changing or clearing the override', async () => {
  const onOverride = jest.fn();
  const onReset = jest.fn();
  await act(async () => root.render(<CalculatedEditableField label="Gross Sheets" calculatedValue={1200} overrideValue={1200} onOverride={onOverride} onReset={onReset} />));
  await act(async () => Simulate.click(container.querySelector('[aria-label="Edit Gross Sheets"]')));
  const input = container.querySelector('input');
  const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 });
  await act(async () => input.dispatchEvent(wheel));
  expect(container.querySelector('input')).toBeNull();
  expect(onOverride).not.toHaveBeenCalled();
  expect(onReset).not.toHaveBeenCalled();
  expect(wheel.defaultPrevented).toBe(false);
});

test.each(['down', 'up'])('floating label follows %s collision direction, persists on selection and resets when cleared', async direction => {
  function SelectHarness() {
    const [value, setValue] = React.useState('');
    return <PremiumSelect label="Machine Size" options={{ size1: { label: 'Size 1' } }} value={value} onChange={setValue} />;
  }
  await act(async () => root.render(<SelectHarness />));
  const trigger = container.querySelector('[role="combobox"]');
  const label = container.querySelector('.premium-select-label');
  expect(container.querySelector('label')).toBeNull();
  expect(trigger.contains(label)).toBe(false);
  expect(trigger.getAttribute('aria-labelledby')).toBe(label.id);
  expect(trigger.textContent).toBe('');
  expect(label.dataset.floated).toBe('false');
  const top = direction === 'up' ? window.innerHeight - 70 : 100;
  const measure = jest.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 44, left: 20, width: 240 });
  await act(async () => Simulate.click(trigger));
  expect(measure).toHaveBeenCalled();
  expect(label.dataset.direction).toBe(direction);
  expect(label.dataset.floated).toBe('true');
  expect(document.querySelector('[role="listbox"]').dataset.direction).toBe(direction);
  await act(async () => Simulate.keyDown(trigger, { key: 'Escape' }));
  expect(label.dataset.floated).toBe('false');
  await act(async () => Simulate.keyDown(trigger, { key: 'Enter' }));
  await act(async () => Simulate.keyDown(trigger, { key: 'End' }));
  await act(async () => Simulate.keyDown(trigger, { key: 'Enter' }));
  expect(trigger.textContent).toBe('Size 1');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(label.dataset.floated).toBe('true');
  expect(label.dataset.direction).toBe(direction);
  await act(async () => Simulate.click(trigger));
  await act(async () => Simulate.keyDown(trigger, { key: 'Home' }));
  await act(async () => Simulate.keyDown(trigger, { key: 'Enter' }));
  expect(trigger.textContent).toBe('');
  expect(label.dataset.floated).toBe('false');
  measure.mockRestore();
});

test('dialog exposes semantics, makes the background inert and restores focus', async () => {
  const close = jest.fn();
  const trigger = document.createElement('button');
  document.body.appendChild(trigger); trigger.focus();
  await act(async () => root.render(<Dialog label="Review changes" onClose={close}><button>Keep</button><button>Cancel</button></Dialog>));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.getAttribute('aria-label')).toBe('Review changes');
  expect(trigger.inert).toBe(true);
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(close).toHaveBeenCalledTimes(1);
  await act(async () => root.render(null));
  expect(trigger.inert).not.toBe(true);
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});