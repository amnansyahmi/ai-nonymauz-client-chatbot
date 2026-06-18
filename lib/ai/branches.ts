/**
 * Branch-based conversation tree for "Edit & Regenerate" UX.
 *
 * Each user message can have multiple assistant responses (branches).
 * Each user message can also have multiple versions (when the user edits
 * their original question). The active path is the path from the root
 * down to the currently-shown message.
 *
 * Storage shape: a flat list of `ConversationNode`s plus an `activePath`
 * of ids from root to leaf.
 */

import type { Message } from '../../components/planner/types';

export type ConversationNode = {
  id: string;
  parentId: string | null;
  message: Message;
  /** Branch index — 0 is the first/primary response, 1+ are alternatives. */
  branchIndex: number;
  createdAt: string;
};

export type BranchTree = {
  nodes: ConversationNode[];
  activePath: string[];
};

const STORAGE_KEY = 'mm-branch-tree';

export function emptyTree(): BranchTree {
  return { nodes: [], activePath: [] };
}

export function loadTree(): BranchTree {
  if (typeof window === 'undefined') return emptyTree();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyTree();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.activePath)) {
      return emptyTree();
    }
    return parsed as BranchTree;
  } catch {
    return emptyTree();
  }
}

export function saveTree(tree: BranchTree): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  } catch {
    // Ignore
  }
}

export function clearTree(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function appendUserMessage(tree: BranchTree, message: Message, parentId: string | null): BranchTree {
  const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const node: ConversationNode = {
    id,
    parentId,
    message,
    branchIndex: 0,
    createdAt: new Date().toISOString()
  };
  return {
    nodes: [...tree.nodes, node],
    activePath: [...tree.activePath, id]
  };
}

export function appendAssistantResponse(
  tree: BranchTree,
  message: Message,
  parentId: string
): BranchTree {
  const siblings = tree.nodes.filter((n) => n.parentId === parentId);
  const branchIndex = siblings.length;
  const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const node: ConversationNode = {
    id,
    parentId,
    message,
    branchIndex,
    createdAt: new Date().toISOString()
  };
  return {
    nodes: [...tree.nodes, node],
    activePath: [...tree.activePath, id]
  };
}

export function appendAlternativeResponse(
  tree: BranchTree,
  message: Message,
  parentId: string
): BranchTree {
  const siblings = tree.nodes.filter((n) => n.parentId === parentId);
  const branchIndex = siblings.length;
  const id = `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const node: ConversationNode = {
    id,
    parentId,
    message,
    branchIndex,
    createdAt: new Date().toISOString()
  };
  return {
    nodes: [...tree.nodes, node],
    activePath: [...tree.activePath, id]
  };
}

export function getActivePath(tree: BranchTree): ConversationNode[] {
  const map = new Map(tree.nodes.map((n) => [n.id, n]));
  return tree.activePath
    .map((id) => map.get(id))
    .filter((n): n is ConversationNode => Boolean(n));
}

export function getActiveMessages(tree: BranchTree): Message[] {
  return getActivePath(tree).map((node) => node.message);
}

export function getSiblings(tree: BranchTree, nodeId: string): ConversationNode[] {
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return [];
  return tree.nodes
    .filter((n) => n.parentId === node.parentId)
    .sort((a, b) => a.branchIndex - b.branchIndex);
}

export function switchBranch(tree: BranchTree, targetNodeId: string): BranchTree {
  const node = tree.nodes.find((n) => n.id === targetNodeId);
  if (!node) return tree;
  const path: string[] = [];
  let cursor: ConversationNode | undefined = node;
  while (cursor) {
    path.unshift(cursor.id);
    cursor = cursor.parentId ? tree.nodes.find((n) => n.id === cursor!.parentId) : undefined;
  }
  return { nodes: tree.nodes, activePath: path };
}

export function trimToActivePath(tree: BranchTree): BranchTree {
  const activeIds = new Set(tree.activePath);
  return {
    nodes: tree.nodes.filter((n) => activeIds.has(n.id) || hasDescendantInPath(tree, n.id, activeIds)),
    activePath: tree.activePath
  };
}

function hasDescendantInPath(tree: BranchTree, nodeId: string, activeIds: Set<string>): boolean {
  return tree.nodes.some((n) => n.parentId === nodeId && activeIds.has(n.id));
}
