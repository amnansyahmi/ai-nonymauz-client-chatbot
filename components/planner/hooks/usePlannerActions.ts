'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import type { PlannerAction } from '@/lib/planner/chatActions';
import type { AppLanguage, Message } from '../types';

export type DisambiguationCandidate = { id: string; label: string; sublabel?: string };

export type AmbiguousAction = {
  action: PlannerAction;
  /** Localized "Which X did you mean?" prompt. */
  question: string;
  candidates: DisambiguationCandidate[];
};

type DisambiguationState = {
  queue: AmbiguousAction[];
  /** Run once the whole queue is resolved (e.g. mark a chat message applied). */
  onComplete: () => void;
};

export type UsePlannerActionsOptions = {
  language: AppLanguage;
  /** Apply a single resolved action to planner state (the stateful switch). */
  applyAction: (action: PlannerAction, salt?: number, targetId?: string) => void;
  /** Return candidates when an action matches multiple items, else null. */
  resolveAmbiguity: (action: PlannerAction) => AmbiguousAction | null;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setStatusMessage: (message: string) => void;
};

/**
 * Owns the disambiguation lifecycle for AI planner actions: applies the
 * unambiguous ones immediately, queues anything that matches multiple items for
 * a "which one?" picker, and runs a completion callback once the queue clears.
 * The stateful apply and the matching logic are injected so this hook stays
 * decoupled from the entity setters.
 */
export function usePlannerActions({
  language,
  applyAction,
  resolveAmbiguity,
  setMessages,
  setStatusMessage
}: UsePlannerActionsOptions) {
  const [disambiguation, setDisambiguation] = useState<DisambiguationState | null>(null);

  // Shared core for applying a batch of AI actions. Used by both the text chat
  // panel and the live-voice sheet.
  function runActionsWithDisambiguation(actions: PlannerAction[], onComplete: () => void) {
    const ambiguous: AmbiguousAction[] = [];
    const ready: PlannerAction[] = [];
    for (const action of actions) {
      const amb = resolveAmbiguity(action);
      if (amb) ambiguous.push(amb);
      else ready.push(action);
    }

    ready.forEach((action, index) => applyAction(action, index));

    if (ambiguous.length > 0) {
      setDisambiguation({ queue: ambiguous, onComplete });
      setStatusMessage(
        ready.length > 0
          ? language === 'ms' ? 'Sebahagian ditambah — sahkan yang berbaki.' : 'Some added — confirm the rest.'
          : language === 'ms' ? 'Sahkan pilihan dahulu.' : 'Please confirm your choice.'
      );
      return;
    }

    onComplete();
  }

  function applyMessageActions(messageIndex: number, actions: PlannerAction[]) {
    runActionsWithDisambiguation(actions, () => {
      setMessages((current) =>
        current.map((message, index) => (index === messageIndex ? { ...message, actionsState: 'applied' } : message))
      );
      setStatusMessage(language === 'ms' ? 'Ditambah ke planner.' : 'Added to your planner.');
    });
  }

  // Resolve the head of the disambiguation queue. targetId = the chosen item;
  // null = skip this one. When the queue empties, run the completion callback.
  function resolveDisambiguation(targetId: string | null) {
    if (!disambiguation) return;
    const [head, ...rest] = disambiguation.queue;
    if (head && targetId) applyAction(head.action, 0, targetId);

    if (rest.length > 0) {
      setDisambiguation({ queue: rest, onComplete: disambiguation.onComplete });
      return;
    }

    disambiguation.onComplete();
    setDisambiguation(null);
  }

  function dismissMessageActions(messageIndex: number) {
    setMessages((current) =>
      current.map((message, index) => (index === messageIndex ? { ...message, actionsState: 'dismissed' } : message))
    );
  }

  return {
    disambiguation,
    runActionsWithDisambiguation,
    applyMessageActions,
    resolveDisambiguation,
    dismissMessageActions
  };
}
