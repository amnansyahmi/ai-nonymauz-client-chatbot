import { describe, expect, it } from 'vitest';
import { isEditableTarget, shouldIgnoreKey } from '../lib/hooks/usePushToTalkHotkey';

function makeInput(): HTMLElement {
  return document.createElement('input');
}

function makeTextarea(): HTMLElement {
  return document.createElement('textarea');
}

function makeContentEditable(): HTMLElement {
  const div = document.createElement('div');
  div.contentEditable = 'true';
  return div;
}

function makeBody(): HTMLElement {
  return document.body;
}

describe('usePushToTalkHotkey filters', () => {
  it('ignores key events when the target is an INPUT', () => {
    const input = makeInput();
    expect(isEditableTarget(input)).toBe(true);
    expect(
      shouldIgnoreKey({
        key: ' ',
        repeat: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: input
      })
    ).toBe(true);
  });

  it('ignores key events when the target is a TEXTAREA', () => {
    expect(isEditableTarget(makeTextarea())).toBe(true);
  });

  it('ignores key events when the target is contentEditable', () => {
    expect(isEditableTarget(makeContentEditable())).toBe(true);
  });

  it('does not ignore key events on a normal body click target', () => {
    const body = makeBody();
    expect(isEditableTarget(body)).toBe(false);
    expect(
      shouldIgnoreKey({
        key: ' ',
        repeat: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: body
      })
    ).toBe(false);
  });

  it('does not consider a null target editable', () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it('ignores repeated keydown events (auto-repeat)', () => {
    const body = makeBody();
    expect(
      shouldIgnoreKey({
        key: ' ',
        repeat: true,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: body
      })
    ).toBe(true);
  });

  it('ignores events with Ctrl/Meta/Alt modifiers', () => {
    const body = makeBody();
    expect(
      shouldIgnoreKey({
        key: ' ',
        repeat: false,
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        target: body
      })
    ).toBe(true);
  });

  it('only accepts the configured key (space by default)', () => {
    const body = makeBody();
    expect(
      shouldIgnoreKey({
        key: 'a',
        repeat: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        target: body
      })
    ).toBe(true);
  });

  it('uses a custom key when supplied', () => {
    const body = makeBody();
    expect(
      shouldIgnoreKey(
        { key: 'v', repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: body },
        'v'
      )
    ).toBe(false);
  });
});
