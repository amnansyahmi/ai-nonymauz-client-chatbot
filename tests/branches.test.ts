import { describe, expect, it } from 'vitest';
import {
  appendAlternativeResponse,
  appendAssistantResponse,
  appendUserMessage,
  emptyTree,
  getActiveMessages,
  getSiblings,
  switchBranch,
  trimToActivePath
} from '../lib/ai/branches';
import type { Message } from '../components/planner/types';

function msg(role: Message['role'], content: string): Message {
  return { role, content };
}

describe('branches', () => {
  it('appends a user message as the first node', () => {
    const tree = appendUserMessage(emptyTree(), msg('user', 'Hello'), null);
    expect(tree.nodes).toHaveLength(1);
    expect(tree.activePath).toHaveLength(1);
    expect(tree.activePath[0]).toBe(tree.nodes[0].id);
  });

  it('appends an assistant response to a user message', () => {
    let tree = appendUserMessage(emptyTree(), msg('user', 'Hello'), null);
    const userId = tree.activePath[0];
    tree = appendAssistantResponse(tree, msg('assistant', 'Hi there'), userId);
    expect(tree.nodes).toHaveLength(2);
    expect(tree.activePath).toHaveLength(2);
  });

  it('appends an alternative response to the same user message', () => {
    let tree = appendUserMessage(emptyTree(), msg('user', 'Hello'), null);
    const userId = tree.activePath[0];
    tree = appendAssistantResponse(tree, msg('assistant', 'First answer'), userId);
    tree = appendAlternativeResponse(tree, msg('assistant', 'Second answer'), userId);
    const siblings = getSiblings(tree, tree.activePath[1]);
    expect(siblings).toHaveLength(2);
    expect(siblings[0].message.content).toBe('First answer');
    expect(siblings[1].message.content).toBe('Second answer');
  });

  it('switches between branches', () => {
    let tree = appendUserMessage(emptyTree(), msg('user', 'Hello'), null);
    const userId = tree.activePath[0];
    tree = appendAssistantResponse(tree, msg('assistant', 'Answer A'), userId);
    const idA = tree.activePath[1];
    tree = appendAlternativeResponse(tree, msg('assistant', 'Answer B'), userId);
    tree = switchBranch(tree, idA);
    expect(tree.activePath[1]).toBe(idA);
    const messages = getActiveMessages(tree);
    expect(messages[1].content).toBe('Answer A');
  });

  it('trims nodes not on the active path', () => {
    let tree = appendUserMessage(emptyTree(), msg('user', 'Hello'), null);
    const userId = tree.activePath[0];
    tree = appendAssistantResponse(tree, msg('assistant', 'Answer A'), userId);
    tree = appendAlternativeResponse(tree, msg('assistant', 'Answer B'), userId);
    tree = switchBranch(tree, tree.activePath[1]);
    tree = trimToActivePath(tree);
    expect(tree.nodes.every((n) => tree.activePath.includes(n.id))).toBe(true);
  });

  it('returns empty active path for empty tree', () => {
    expect(getActiveMessages(emptyTree())).toEqual([]);
  });
});
