// import common 3rd party SlickGrid plugins/libs
import 'slickgrid/plugins/slick.cellrangedecorator';
import 'slickgrid/plugins/slick.cellrangeselector';
import 'slickgrid/plugins/slick.cellselectionmodel';

import { Column, Extension, ExtensionModel, GridOption, SlickRowSelectionModel, } from '../interfaces/index';
import { ColumnReorderFunction, ExtensionList, ExtensionName, SlickControlList, SlickPluginList } from '../enums/index';
import {
  CellExternalCopyManagerExtension,
  CheckboxSelectorExtension,
  ExtensionUtility,
  RowDetailViewExtension,
  RowMoveManagerExtension,
  RowSelectionExtension,
} from '../extensions/index';
import { SharedService } from './shared.service';
import { TranslaterService } from './translater.service';
import { AutoTooltipPlugin, CellMenuPlugin, ContextMenuPlugin, DraggableGroupingPlugin, HeaderButtonPlugin, HeaderMenuPlugin } from '../plugins/index';
import { ColumnPickerControl, GridMenuControl } from '../controls/index';
import { FilterService } from './filter.service';
import { GroupItemMetadataProviderService } from './groupItemMetadataProvider.service';
import { PubSubService } from './pubSub.service';
import { SortService } from './sort.service';
import { TreeDataService } from './treeData.service';

interface ExtensionWithColumnIndexPosition {
  name: ExtensionName;
  columnIndexPosition: number;
  extension: CheckboxSelectorExtension | RowDetailViewExtension | RowMoveManagerExtension;
}

export class ExtensionService {
  protected _cellMenuPlugin?: CellMenuPlugin;
  protected _contextMenuPlugin?: ContextMenuPlugin;
  protected _columnPickerControl?: ColumnPickerControl;
  protected _draggleGroupingPlugin?: DraggableGroupingPlugin;
  protected _gridMenuControl?: GridMenuControl;
  protected _groupItemMetadataProviderService?: GroupItemMetadataProviderService;
  protected _headerMenuPlugin?: HeaderMenuPlugin;
  protected _extensionCreatedList: ExtensionList<any, any> = {} as ExtensionList<any, any>;
  protected _extensionList: ExtensionList<any, any> = {} as ExtensionList<any, any>;

  get extensionList() {
    return this._extensionList;
  }

  get gridOptions(): GridOption {
    return this.sharedService.gridOptions || {};
  }

  constructor(
    protected readonly extensionUtility: ExtensionUtility,
    protected readonly filterService: FilterService,
    protected readonly pubSubService: PubSubService,
    protected readonly sortService: SortService,
    protected readonly treeDataService: TreeDataService,

    protected readonly cellExternalCopyExtension: CellExternalCopyManagerExtension,
    protected readonly checkboxSelectorExtension: CheckboxSelectorExtension,
    protected readonly rowDetailViewExtension: RowDetailViewExtension,
    protected readonly rowMoveManagerExtension: RowMoveManagerExtension,
    protected readonly rowSelectionExtension: RowSelectionExtension,
    protected readonly sharedService: SharedService,
    protected readonly translaterService?: TranslaterService,
  ) { }

  /** Dispose of all the controls & plugins */
  dispose() {
    this.sharedService.visibleColumns = [];

    // dispose of each control/plugin & reset the list
    for (const extensionName of Object.keys(this._extensionList)) {
      if (this._extensionList.hasOwnProperty(extensionName)) {
        const extension = this._extensionList[extensionName as keyof Record<ExtensionName, ExtensionModel<any, any>>] as ExtensionModel<any, any>;
        if (extension?.class?.dispose) {
          extension.class.dispose();
        }
        if (extension?.instance?.dispose) {
          extension.instance.dispose();
        }
      }
    }
    for (const key of Object.keys(this._extensionList)) {
      delete this._extensionList[key as keyof Record<ExtensionName, ExtensionModel<any, any>>];
    }
  }

  /** Get all columns (includes visible and non-visible) */
  getAllColumns(): Column[] {
    return this.sharedService.allColumns || [];
  }

  /** Get only visible columns */
  getVisibleColumns(): Column[] {
    return this.sharedService.visibleColumns || [];
  }

  /**
   * Get an Extension that was created by calling its "create" method (there are only 3 extensions which uses this method)
   *  @param name
   */
  getCreatedExtensionByName<P extends (SlickControlList | SlickPluginList) = any, E extends Extension = any>(name: ExtensionName): ExtensionModel<P, E> | undefined {
    if (this._extensionCreatedList && this._extensionCreatedList.hasOwnProperty(name)) {
      return this._extensionCreatedList[name];
    }
    return undefined;
  }

  /**
   * Get an Extension by it's name
   *  @param name
   */
  getExtensionByName<P extends (SlickControlList | SlickPluginList) = any, E extends Extension = Extension>(name: ExtensionName): ExtensionModel<P, E> | undefined {
    if (this._extensionList && this._extensionList[name]) {
      return this._extensionList[name];
    }
    return undefined;
  }

  /**
   * Get the instance of the SlickGrid addon (control or plugin).
   * This is the raw addon coming directly from SlickGrid itself, not to confuse with Slickgrid-Universal extension
   *  @param name
   */
  getSlickgridAddonInstance(name: ExtensionName): any {
    const extension = this.getExtensionByName(name);
    if (extension && extension.class && (extension.instance)) {
      return extension.class?.getAddonInstance?.() ?? extension.instance;
    }
    return null;
  }

  /** Auto-resize all the column in the grid to fit the grid width */
  autoResizeColumns() {
    this.sharedService.slickGrid.autosizeColumns();
  }

  /** Bind/Create different Controls or Plugins after the Grid is created */
  bindDifferentExtensions() {
    if (this.gridOptions) {
      // make sure all columns are translated before creating ColumnPicker/GridMenu Controls
      // this is to avoid having hidden columns not being translated on first load
      if (this.gridOptions.enableTranslate) {
        this.translateItems(this.sharedService.allColumns, 'nameKey', 'name');
      }

      // Auto Tooltip Plugin
      if (this.gridOptions.enableAutoTooltip) {
        const instance = new AutoTooltipPlugin(this.gridOptions?.autoTooltipOptions);
        this.sharedService.slickGrid.registerPlugin<AutoTooltipPlugin>(instance);
        this._extensionList[ExtensionName.autoTooltip] = { name: ExtensionName.autoTooltip, class: instance, instance };
      }

      // Cell External Copy Manager Plugin (Excel Like)
      if (this.gridOptions.enableExcelCopyBuffer && this.cellExternalCopyExtension && this.cellExternalCopyExtension.register) {
        const instance = this.cellExternalCopyExtension.register();
        if (instance) {
          this._extensionList[ExtensionName.cellExternalCopyManager] = { name: ExtensionName.cellExternalCopyManager, class: this.cellExternalCopyExtension, instance };
        }
      }

      // (Action) Cell Menu Plugin
      if (this.gridOptions.enableCellMenu) {
        this._cellMenuPlugin = new CellMenuPlugin(this.extensionUtility, this.pubSubService, this.sharedService);
        if (this.gridOptions.cellMenu?.onExtensionRegistered) {
          this.gridOptions.cellMenu.onExtensionRegistered(this._cellMenuPlugin);
        }
        this._extensionList[ExtensionName.cellMenu] = { name: ExtensionName.cellMenu, class: this._cellMenuPlugin, instance: this._cellMenuPlugin };
      }

      // Row Selection Plugin
      // this extension should be registered BEFORE the CheckboxSelector, RowDetail or RowMoveManager since it can be use by these 2 plugins
      if (!this.getExtensionByName(ExtensionName.rowSelection) && (this.gridOptions.enableRowSelection || this.gridOptions.enableCheckboxSelector || this.sharedService.gridOptions.enableRowDetailView || this.sharedService.gridOptions.enableRowMoveManager)) {
        if (this.rowSelectionExtension && this.rowSelectionExtension.register) {
          const instance = this.rowSelectionExtension.register();
          if (instance) {
            this._extensionList[ExtensionName.rowSelection] = { name: ExtensionName.rowSelection, class: this.rowSelectionExtension, instance };
          }
        }
      }

      // Checkbox Selector Plugin
      if (this.gridOptions.enableCheckboxSelector && this.checkboxSelectorExtension && this.checkboxSelectorExtension.register) {
        const rowSelectionExtension = this.getExtensionByName(ExtensionName.rowSelection);
        this.checkboxSelectorExtension.register(rowSelectionExtension?.instance as SlickRowSelectionModel);
        const createdExtension = this.getCreatedExtensionByName(ExtensionName.checkboxSelector); // get the instance from when it was really created earlier
        const instance = createdExtension && createdExtension.instance;
        if (instance) {
          this._extensionList[ExtensionName.checkboxSelector] = { name: ExtensionName.checkboxSelector, class: this.checkboxSelectorExtension, instance };
        }
      }

      // Column Picker Control
      if (this.gridOptions.enableColumnPicker) {
        this._columnPickerControl = new ColumnPickerControl(this.extensionUtility, this.pubSubService, this.sharedService);
        if (this.gridOptions.columnPicker?.onExtensionRegistered) {
          this.gridOptions.columnPicker.onExtensionRegistered(this._columnPickerControl);
        }
        this._extensionList[ExtensionName.columnPicker] = { name: ExtensionName.columnPicker, class: this._columnPickerControl, instance: this._columnPickerControl };
      }

      // Context Menu Control
      if (this.gridOptions.enableContextMenu) {
        this._contextMenuPlugin = new ContextMenuPlugin(this.extensionUtility, this.pubSubService, this.sharedService, this.treeDataService);
        if (this.gridOptions.contextMenu?.onExtensionRegistered) {
          this.gridOptions.contextMenu.onExtensionRegistered(this._contextMenuPlugin);
        }
        this._extensionList[ExtensionName.contextMenu] = { name: ExtensionName.contextMenu, class: this._contextMenuPlugin, instance: this._contextMenuPlugin };
      }

      // Draggable Grouping Plugin
      if (this.gridOptions.enableDraggableGrouping) {
        if (this._draggleGroupingPlugin) {
          this._draggleGroupingPlugin.init(this.sharedService.slickGrid, this.gridOptions.draggableGrouping);
          if (this.gridOptions.draggableGrouping?.onExtensionRegistered) {
            this.gridOptions.draggableGrouping.onExtensionRegistered(this._draggleGroupingPlugin);
          }
          this._extensionList[ExtensionName.contextMenu] = { name: ExtensionName.contextMenu, class: this._draggleGroupingPlugin, instance: this._draggleGroupingPlugin };
        }
        this._extensionList[ExtensionName.draggableGrouping] = { name: ExtensionName.draggableGrouping, class: this._draggleGroupingPlugin, instance: this._draggleGroupingPlugin };
      }

      // Grid Menu Control
      if (this.gridOptions.enableGridMenu) {
        this._gridMenuControl = new GridMenuControl(this.extensionUtility, this.filterService, this.pubSubService, this.sharedService, this.sortService);
        if (this.gridOptions.gridMenu?.onExtensionRegistered) {
          this.gridOptions.gridMenu.onExtensionRegistered(this._gridMenuControl);
        }
        this._extensionList[ExtensionName.gridMenu] = { name: ExtensionName.gridMenu, class: this._gridMenuControl, instance: this._gridMenuControl };
      }

      // Grouping Plugin
      // register the group item metadata provider to add expand/collapse group handlers
      if (this.gridOptions.enableDraggableGrouping || this.gridOptions.enableGrouping) {
        this._groupItemMetadataProviderService = this._groupItemMetadataProviderService ? this._groupItemMetadataProviderService : new GroupItemMetadataProviderService();
        this._groupItemMetadataProviderService.init(this.sharedService.slickGrid);
        this._extensionList[ExtensionName.groupItemMetaProvider] = { name: ExtensionName.groupItemMetaProvider, class: this._groupItemMetadataProviderService, instance: this._groupItemMetadataProviderService };
      }

      // Header Button Plugin
      if (this.gridOptions.enableHeaderButton) {
        const headerButtonPlugin = new HeaderButtonPlugin(this.extensionUtility, this.pubSubService, this.sharedService);
        if (this.gridOptions.headerButton?.onExtensionRegistered) {
          this.gridOptions.headerButton.onExtensionRegistered(headerButtonPlugin);
        }
        this._extensionList[ExtensionName.headerButton] = { name: ExtensionName.headerButton, class: headerButtonPlugin, instance: headerButtonPlugin };
      }

      // Header Menu Plugin
      if (this.gridOptions.enableHeaderMenu) {
        this._headerMenuPlugin = new HeaderMenuPlugin(this.extensionUtility, this.filterService, this.pubSubService, this.sharedService, this.sortService);
        if (this.gridOptions.headerMenu?.onExtensionRegistered) {
          this.gridOptions.headerMenu.onExtensionRegistered(this._headerMenuPlugin);
        }
        this._extensionList[ExtensionName.headerMenu] = { name: ExtensionName.headerMenu, class: this._headerMenuPlugin, instance: this._headerMenuPlugin };
      }

      // Row Detail View Plugin
      if (this.gridOptions.enableRowDetailView) {
        if (this.rowDetailViewExtension && this.rowDetailViewExtension.register) {
          const rowSelectionExtension = this.getExtensionByName(ExtensionName.rowSelection);
          this.rowDetailViewExtension.register(rowSelectionExtension?.instance);
          const createdExtension = this.getCreatedExtensionByName(ExtensionName.rowDetailView); // get the plugin from when it was really created earlier
          const instance = createdExtension && createdExtension.instance;
          if (instance) {
            this._extensionList[ExtensionName.rowDetailView] = { name: ExtensionName.rowDetailView, class: this.rowDetailViewExtension, instance };
          }
        }
      }

      // Row Move Manager Plugin
      if (this.gridOptions.enableRowMoveManager && this.rowMoveManagerExtension && this.rowMoveManagerExtension.register) {
        const rowSelectionExtension = this.getExtensionByName(ExtensionName.rowSelection);
        this.rowMoveManagerExtension.register(rowSelectionExtension?.instance as SlickRowSelectionModel);
        const createdExtension = this.getCreatedExtensionByName(ExtensionName.rowMoveManager); // get the instance from when it was really created earlier
        const instance = createdExtension && createdExtension.instance;
        if (instance) {
          this._extensionList[ExtensionName.rowMoveManager] = { name: ExtensionName.rowMoveManager, class: this.rowMoveManagerExtension, instance };
        }
      }
    }
  }

  /**
   * Bind/Create certain plugins before the Grid creation to avoid having odd behaviors.
   * Mostly because the column definitions might change after the grid creation, so we want to make sure to add it before then
   * @param columnDefinitions
   * @param gridOptions
   */
  createExtensionsBeforeGridCreation(columnDefinitions: Column[], gridOptions: GridOption) {
    const featureWithColumnIndexPositions: ExtensionWithColumnIndexPosition[] = [];

    // the following 3 features might have `columnIndexPosition` that we need to respect their column order, we will execute them by their sort order further down
    // we push them into a array and we'll process them by their position (if provided, else use same order that they were inserted)
    if (gridOptions.enableCheckboxSelector) {
      if (!this.getCreatedExtensionByName(ExtensionName.checkboxSelector)) {
        featureWithColumnIndexPositions.push({ name: ExtensionName.checkboxSelector, extension: this.checkboxSelectorExtension, columnIndexPosition: gridOptions?.checkboxSelector?.columnIndexPosition ?? featureWithColumnIndexPositions.length });
      }
    }
    if (gridOptions.enableRowMoveManager) {
      if (!this.getCreatedExtensionByName(ExtensionName.rowMoveManager)) {
        featureWithColumnIndexPositions.push({ name: ExtensionName.rowMoveManager, extension: this.rowMoveManagerExtension, columnIndexPosition: gridOptions?.rowMoveManager?.columnIndexPosition ?? featureWithColumnIndexPositions.length });
      }
    }
    if (gridOptions.enableRowDetailView) {
      if (!this.getCreatedExtensionByName(ExtensionName.rowDetailView)) {
        featureWithColumnIndexPositions.push({ name: ExtensionName.rowDetailView, extension: this.rowDetailViewExtension, columnIndexPosition: gridOptions?.rowDetailView?.columnIndexPosition ?? featureWithColumnIndexPositions.length });
      }
    }

    // since some features could have a `columnIndexPosition`, we need to make sure these indexes are respected in the column definitions
    this.createExtensionByTheirColumnIndex(featureWithColumnIndexPositions, columnDefinitions, gridOptions);

    if (gridOptions.enableDraggableGrouping) {
      if (!this.getCreatedExtensionByName(ExtensionName.draggableGrouping)) {
        this._draggleGroupingPlugin = new DraggableGroupingPlugin(this.extensionUtility, this.pubSubService, this.sharedService);
        if (this._draggleGroupingPlugin) {
          gridOptions.enableColumnReorder = this._draggleGroupingPlugin.setupColumnReorder as ColumnReorderFunction;
          this._extensionCreatedList[ExtensionName.draggableGrouping] = { name: ExtensionName.draggableGrouping, instance: this._draggleGroupingPlugin, class: this._draggleGroupingPlugin };
        }
      }
    }
  }

  /** Hide a column from the grid */
  hideColumn(column: Column) {
    if (typeof this.sharedService?.slickGrid?.getColumns === 'function') {
      const columnIndex = this.sharedService.slickGrid.getColumnIndex(column.id);
      this.sharedService.visibleColumns = this.removeColumnByIndex(this.sharedService.slickGrid.getColumns(), columnIndex);
      this.sharedService.slickGrid.setColumns(this.sharedService.visibleColumns);
    }
  }

  /** Refresh the dataset through the Backend Service */
  refreshBackendDataset(gridOptions?: GridOption) {
    this.extensionUtility.refreshBackendDataset(gridOptions);
  }

  /**
   * Remove a column from the grid by it's index in the grid
   * @param columns input
   * @param index
   */
  removeColumnByIndex(columns: Column[], index: number): Column[] {
    if (Array.isArray(columns)) {
      return columns.filter((_el: Column, i: number) => index !== i);
    }
    return columns;
  }

  /** Translate all possible Extensions at once */
  translateAllExtensions() {
    this.translateCellMenu();
    this.translateColumnHeaders();
    this.translateColumnPicker();
    this.translateContextMenu();
    this.translateGridMenu();
    this.translateHeaderMenu();
  }

  /** Translate the Cell Menu titles, we need to loop through all column definition to re-translate them */
  translateCellMenu() {
    this._cellMenuPlugin?.translateCellMenu?.();
  }

  /** Translate the Column Picker and it's last 2 checkboxes */
  translateColumnPicker() {
    if (this._columnPickerControl?.translateColumnPicker) {
      this._columnPickerControl.translateColumnPicker();
    }
  }

  /** Translate the Context Menu titles, we need to loop through all column definition to re-translate them */
  translateContextMenu() {
    this._contextMenuPlugin?.translateContextMenu?.();
  }

  /**
   * Translate the Header Menu titles, we need to loop through all column definition to re-translate them
   */
  translateGridMenu() {
    this._gridMenuControl?.translateGridMenu?.();
  }

  /**
   * Translate the Header Menu titles, we need to loop through all column definition to re-translate them
   */
  translateHeaderMenu() {
    this._headerMenuPlugin?.translateHeaderMenu?.();
  }

  /**
   * Translate manually the header titles.
   * We could optionally pass a locale (that will change currently loaded locale), else it will use current locale
   * @param locale to use
   * @param new column definitions (optional)
   */
  translateColumnHeaders(locale?: boolean | string, newColumnDefinitions?: Column[]) {
    if (this.sharedService && this.gridOptions && this.gridOptions.enableTranslate && (!this.translaterService || !this.translaterService.translate)) {
      throw new Error('[Slickgrid-Universal] requires a Translate Service to be installed and configured when the grid option "enableTranslate" is enabled.');
    }

    if (locale && this.translaterService?.use) {
      this.translaterService.use(locale as string);
    }

    let columnDefinitions = newColumnDefinitions;
    if (!columnDefinitions) {
      columnDefinitions = this.sharedService.columnDefinitions;
    }

    this.translateItems(columnDefinitions, 'nameKey', 'name');
    this.translateItems(this.sharedService.allColumns, 'nameKey', 'name');

    // re-render the column headers
    this.renderColumnHeaders(columnDefinitions, Array.isArray(newColumnDefinitions));
    this._gridMenuControl?.translateGridMenu?.();
  }

  /**
   * Render (or re-render) the column headers from column definitions.
   * calling setColumns() will trigger a grid re-render
   */
  renderColumnHeaders(newColumnDefinitions?: Column[], forceColumnDefinitionsOverwrite = false) {
    let collection = newColumnDefinitions;
    if (!collection) {
      collection = this.sharedService.columnDefinitions;
    }
    if (Array.isArray(collection) && this.sharedService.slickGrid && this.sharedService.slickGrid.setColumns) {
      if (collection.length > this.sharedService.allColumns.length || forceColumnDefinitionsOverwrite) {
        this.sharedService.allColumns = collection;
      }
      this.sharedService.slickGrid.setColumns(collection);
    }

    // replace Column Picker columns with newer data which includes new translations
    if (this.gridOptions.enableColumnPicker && this._columnPickerControl) {
      this._columnPickerControl.columns = this.sharedService.allColumns;
    }

    // replace the Grid Menu columns array list
    if (this._gridMenuControl) {
      this._gridMenuControl.columns = this.sharedService.allColumns ?? [];
    }
  }

  //
  // protected functions
  // -------------------

  /**
   * Some extension (feature) have specific `columnIndexPosition` that the developer want to use, we need to make sure these indexes are respected in the column definitions in the order provided.
   * The following 3 features could have that optional `columnIndexPosition` and we need to respect their column order, we will first sort by their optional order and only after we will create them by their specific order.
   * We'll process them by their position (if provided, else use same order that they were inserted)
   * @param featureWithIndexPositions
   * @param columnDefinitions
   * @param gridOptions
   */
  protected createExtensionByTheirColumnIndex(featureWithIndexPositions: ExtensionWithColumnIndexPosition[], columnDefinitions: Column[], gridOptions: GridOption) {
    // 1- first step is to sort them by their index position
    featureWithIndexPositions.sort((feat1, feat2) => feat1.columnIndexPosition - feat2.columnIndexPosition);

    // 2- second step, we can now proceed to create each extension/addon and that will position them accordingly in the column definitions list
    featureWithIndexPositions.forEach(feature => {
      const instance = feature.extension.create(columnDefinitions, gridOptions);
      if (instance) {
        this._extensionCreatedList[feature.name] = { name: feature.name, instance, class: feature.extension };
      }
    });
  }

  /** Translate an array of items from an input key and assign translated value to the output key */
  protected translateItems(items: any[], inputKey: string, outputKey: string) {
    if (this.gridOptions?.enableTranslate && !(this.translaterService?.translate)) {
      throw new Error('[Slickgrid-Universal] requires a Translate Service to be installed and configured when the grid option "enableTranslate" is enabled.');
    }

    if (Array.isArray(items)) {
      for (const item of items) {
        if (item[inputKey]) {
          item[outputKey] = this.translaterService?.translate(item[inputKey]);
        }
      }
    }
  }
}
