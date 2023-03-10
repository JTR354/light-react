# light react

跟着卡颂从 0 实现一个最接近 React18 的 react

## 笔记

### 1. 配置项目

### 2. 实现 jsx

- createElement
- jsx
- 打包生成 react，jsx-runtime,jsx-dev-runtime
- 调试代码

### 3. react-reconcile

- fiberNode
  - fiber
  - workTags: 记录当前是什么类型的节点
  - fiberFlags: 记录有哪些操作（副作用）
- workLoop
  - prepareFreshStack
  - renderRoot
  - performUnitOfWork
  - beginWork
  - completeUnitOfWork
  - completeWork

### 4-1. update-queue

- createUpdate
- createUpdateQueue
- enqueueUpdate
- processUpdateQueue

### 4-2 fiber-reconciler

- createContainer
- updateContainer
- scheduleUpdateOnFiber
- markUpdateFromFiberToRoot
- renderRoot
- prepareFreshStack
- createWorkInProcess

### 5-1 begin-work

- updateHostRoot
- updateHostComponent
- reconcileChildren
- reconcileChildFibers

- ChildFibers
  - ChildReconciler
  - reconcileChildFibers
  - mountChildFibers
  - reconcileSingleElement
  - reconcileSingleTextNode
  - createFiberFromElement
  - placeSingleChild

### 5-2 complete-work

- createInstance
- createTextInstance
- appendInitialChild
- appendAllChildren
- bubbleProperties

### 6-1 commit & mutation

- commitRoot
- commitMutationEffects
- commitMutationEffectOnFiber
- commitPlacement
- getHostParent
- appendPlacementNodeIntoContainer
- appendChildToParent

### 7-1 function-component

- fiberHooks

### 8-1 hooks

- currentDispatcher
- resolveDispatcher
- SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
- currentlyRenderingFiber
- workInProcessHook

### 8-2 useState

- HooksDispatchOnMount
- mountState
- mountWorkInProcess
- dispatchSetState

### 10-1 update render

- deletionChild
- useFiber
- markUpdate

### 10-2 update commit

- commitUpdate
- commitTextUpdate
- commitDeletion
- commitNestedComponent
- removeChild

### 10-3 update useState

- HookDispatcherOnUpdate
- updateState
- updateWorkInProcess
- currentHook

### 11 synthetic-event

- SyntheticEvent
- updateFiberProps
- initEvent
- dispatchEvent
- collectPaths
- getEventCallbackFromEventType
- createSyntheticEvent
- triggerEventFlow

### 12 diff single

- deleteRemainingChildren

### 12-2 diff multiple

- reconcileChildrenArray
- updateFromMap

### 12-3 diff commit

- getHostSibling
- insertChildToContainer

### 13 fragment

- isUnKeyedToLevelFragment
- createFiberFromFragment
- updateFragment
- updateFragmentComponent
- recordHostChildDeletion

### 13 batch update

- fiberLanes/
- mergeLanes
- requestUpdateLane
- getHighestPriorityLane
- markUpdateRootLanes
- enqueueUpdateQueue
- processUpdateQueue
- markRootUpdated
- ensureRootIsScheduled
- syncTaskQueue/
- scheduleSynCallback
- flushSyncCallbacks
- scheduleMicroTask
