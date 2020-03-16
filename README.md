# Slickgrid-Universal

This is a monorepo project (using Lerna) which regroups a few packages under a single repository. The goal is to create a common repo that includes all Editors, Filters, Extensions and Services that could be used by any Framework (it is framework agnostic). It's also a good opportunity to decouple some other features that not all users need, this will also help in getting a smaller bundle, for example not lot users require backend services (OData, GraphQL), which is why these are better handled in a monorepo structure. 

### Why create this monorepo?
You might be wondering why was this monorepo created?
1. it removes lot of duplicate code that existed in both [Angular-Slickgrid](https://github.com/ghiscoding/Angular-Slickgrid) and [Aurelia-Slickgrid](https://github.com/ghiscoding/aurelia-slickgrid) (over 80% were the same code and that is not very DRY).
2. removes any Services that not all user need (OData, GraphQL, ...)
3. framework agnostic, it can be implemented in many more frameworks in the future

### Framework using this monorepo
This a Work in Progress, eventually [Angular-Slickgrid](https://github.com/ghiscoding/Angular-Slickgrid) and [Aurelia-Slickgrid](https://github.com/ghiscoding/aurelia-slickgrid) will be rewritten to use this monorepo and have shared common code. 

However, this project is built with a Vanilla Implementation (no associated to any framework) and that is what the UI will be tested with. The Vanilla bundle is also used in our SalesForce (with Lighning Web Component) hence the creation of this monorepo.

The main packages structure is the following
- `@slickgrid-universal/common` where are commonly used Services/Formatters/Editors/... are created
  - this can then be used by any Framework (Angular, Aurelia, Vanilla, ...)
- `@slickgrid-universal/vanilla-bundle` is a vanilla implementation (no framework)
- `slickgrid-universal/vanilla-bundle-examples` standalone package for demo purposes and UI testing (not a public package)

### Installation
To get going with this monorepo, you will need to clone the repo and then follow the steps below

1. Lerna Bootstrap
Run it **only once**, this will install all dependencies and add necessary monorepo symlinks
```bash
npm run bootstrap
```

2. Build
To get started you must also run (also once) an initial build so that all necessary `dist` are created for all the packages to work together.
```bash
npm run build
```

3. Run Dev (Vanilla Implementation)
There is a Vanilla flavor implementation in this monorepo, vanilla means that it is not associated to any framework in other words it is plain TypeScript without being bound to any framework. The implementation is very similar to Angular and Aurelia, it could be used to implement other frameworks. 

```bash
npm run dev:watch
```

### Tests

##### Unit Tests
To run all packages Jest unit tests, you can run this command
```bash
npm run test

# or as a watch
npm run test:watch
```

TODO
#### Implementation
- [x] Aggregators (4)
- [ ] Editors
  - [ ] Autocomplete
  - [ ] Checkbox
  - [ ] Date
  - [x] Float
  - [x] Integer
  - [x] Long Text
  - [ ] Multiple Select
  - [ ] Single Select
  - [x] Slider
  - [x] Text
- [ ] Filters
  - [ ] Autocomplete
  - [ ] Compound Date
  - [ ] Compound Input(s)
  - [ ] Compound Slider
  - [ ] Date Range
  - [x] Input(s)
  - [ ] Multiple Select 
  - [ ] Single Select 
  - [x] Native Select 
  - [ ] Slider
  - [ ] Slider Range
- [x] Formatters (31)
- [ ] Extensions
  - [x] AutoTooltip
  - [x] Cell External Copy Manager
  - [x] Cell Menu
  - [x] Checkbox Selector
  - [x] Context Menu
  - [x] Draggable Grouping
  - [x] Grid Menu
  - [x] Header Button
  - [x] Header Menu
  - [ ] Row Detail
  - [x] Row Move
  - [x] Row Selection
- [x] Grouping Formatters (12)
- [x] Sorters (5)
- [ ] Services
  - [x] Collection
  - [ ] Excel Export
  - [ ] Export Text
  - [x] Extension
  - [x] Filter
  - [ ] GraphQL
  - [ ] OData
  - [ ] Grid Event
  - [ ] Grid State
  - [x] Grouping & Col Span
  - [ ] Pagination
  - [ ] Resizer
  - [x] Shared
  - [x] Sort

#### Extra Todos
- [ ] Add Multiple Example Demos with Vanilla implementation
  - [ ] Add built demo as a GitHub Demo website
- [ ] Add Cypress E2E tests
- [ ] Add Jest Unit tests
