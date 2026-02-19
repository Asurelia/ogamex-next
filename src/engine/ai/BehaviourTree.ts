/**
 * Behaviour Tree framework for client-side NPC AI.
 * All AI runs locally in the browser - no cloud API calls.
 */

export enum BTStatus {
  SUCCESS = 0,
  FAILURE = 1,
  RUNNING = 2,
}

export abstract class BTNode {
  abstract tick(eid: number): BTStatus
}

/**
 * Selector (OR node) - tries each child in order, returns SUCCESS on first success.
 * Returns FAILURE only if all children fail.
 */
export class Selector extends BTNode {
  private children: BTNode[]

  constructor(...children: BTNode[]) {
    super()
    this.children = children
  }

  tick(eid: number): BTStatus {
    for (const child of this.children) {
      const status = child.tick(eid)
      if (status !== BTStatus.FAILURE) {
        return status
      }
    }
    return BTStatus.FAILURE
  }
}

/**
 * Sequence (AND node) - runs each child in order, returns FAILURE on first failure.
 * Returns SUCCESS only if all children succeed.
 */
export class Sequence extends BTNode {
  private children: BTNode[]

  constructor(...children: BTNode[]) {
    super()
    this.children = children
  }

  tick(eid: number): BTStatus {
    for (const child of this.children) {
      const status = child.tick(eid)
      if (status !== BTStatus.SUCCESS) {
        return status
      }
    }
    return BTStatus.SUCCESS
  }
}

/**
 * Condition - wraps a predicate function. Returns SUCCESS if true, FAILURE if false.
 */
export class Condition extends BTNode {
  private predicate: (eid: number) => boolean

  constructor(predicate: (eid: number) => boolean) {
    super()
    this.predicate = predicate
  }

  tick(eid: number): BTStatus {
    return this.predicate(eid) ? BTStatus.SUCCESS : BTStatus.FAILURE
  }
}

/**
 * Action - wraps an action function that returns BTStatus directly.
 */
export class Action extends BTNode {
  private fn: (eid: number) => BTStatus

  constructor(fn: (eid: number) => BTStatus) {
    super()
    this.fn = fn
  }

  tick(eid: number): BTStatus {
    return this.fn(eid)
  }
}

/**
 * Inverter - inverts child result (SUCCESS<->FAILURE, RUNNING stays RUNNING).
 */
export class Inverter extends BTNode {
  private child: BTNode

  constructor(child: BTNode) {
    super()
    this.child = child
  }

  tick(eid: number): BTStatus {
    const status = this.child.tick(eid)
    if (status === BTStatus.SUCCESS) return BTStatus.FAILURE
    if (status === BTStatus.FAILURE) return BTStatus.SUCCESS
    return BTStatus.RUNNING
  }
}

/**
 * AlwaysSucceed - wraps a node and always returns SUCCESS.
 */
export class AlwaysSucceed extends BTNode {
  private child: BTNode

  constructor(child: BTNode) {
    super()
    this.child = child
  }

  tick(eid: number): BTStatus {
    this.child.tick(eid)
    return BTStatus.SUCCESS
  }
}
