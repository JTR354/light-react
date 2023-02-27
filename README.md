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
