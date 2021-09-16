/* eslint-disable @typescript-eslint/no-this-alias */
import { Column, ColumnPickerOption, DOMEvent, GridMenuOption } from '../interfaces';
import { sanitizeTextByAvailableSanitizer } from '../services/utilities';
import { ColumnPickerControl } from '../controls/columnPicker.control';
import { GridMenuControl } from '../controls/gridMenu.control';

/** Create a Close button element and add it to the Menu element */
export function addCloseButtomElement(this: ColumnPickerControl | GridMenuControl, menuElm: HTMLDivElement) {
  const context: any = this;
  const closePickerButtonElm = document.createElement('button');
  closePickerButtonElm.className = 'close';
  closePickerButtonElm.type = 'button';
  closePickerButtonElm.dataset.dismiss = context instanceof ColumnPickerControl ? 'slick-columnpicker' : 'slick-grid-menu';
  closePickerButtonElm.setAttribute('aria-label', 'Close');

  const closeSpanElm = document.createElement('span');
  closeSpanElm.className = 'close';
  closeSpanElm.innerHTML = '&times;';
  closeSpanElm.setAttribute('aria-hidden', 'true');
  closePickerButtonElm.appendChild(closeSpanElm);
  menuElm.appendChild(closePickerButtonElm);
}

/** When "columnTitle" option is provided, let's create a div element to show "Columns" list title */
export function addColumnTitleElementWhenDefined(this: ColumnPickerControl | GridMenuControl, menuElm: HTMLDivElement) {
  const context: any = this;
  if (context.addonOptions?.columnTitle) {
    context._columnTitleElm = document.createElement('div');
    context._columnTitleElm.className = 'title';
    context._columnTitleElm.textContent = context.addonOptions?.columnTitle ?? context._defaults.columnTitle;
    menuElm.appendChild(context._columnTitleElm);
  }
}

/**
 * When clicking an input checkboxes from the column picker list to show/hide a column (or from the picker extra commands like forcefit columns)
 * @param event - input checkbox event
 * @returns
 */
export function handleColumnPickerItemClick(this: ColumnPickerControl | GridMenuControl, event: DOMEvent<HTMLInputElement>) {
  const context: any = this;
  const controlType = context instanceof ColumnPickerControl ? 'columnPicker' : 'gridMenu';

  if (event.target.dataset.option === 'autoresize') {
    // when calling setOptions, it will resize with ALL Columns (even the hidden ones)
    // we can avoid this problem by keeping a reference to the visibleColumns before setOptions and then setColumns after
    const previousVisibleColumns = context.getVisibleColumns();
    const isChecked = event.target.checked;
    context.grid.setOptions({ forceFitColumns: isChecked });
    context.grid.setColumns(previousVisibleColumns);
    return;
  }

  if (event.target.dataset.option === 'syncresize') {
    context.grid.setOptions({ syncColumnCellResize: !!(event.target.checked) });
    return;
  }

  if (event.target.type === 'checkbox') {
    context._areVisibleColumnDifferent = true;
    const isChecked = event.target.checked;
    const columnId = event.target.dataset.columnid || '';
    const visibleColumns: Column[] = [];
    context._columnCheckboxes.forEach((columnCheckbox: HTMLInputElement, idx: number) => {
      if (columnCheckbox.checked) {
        visibleColumns.push(context.columns[idx]);
      }
    });

    if (!visibleColumns.length) {
      event.target.checked = true;
      return;
    }

    context.grid.setColumns(visibleColumns);

    // keep reference to the updated visible columns list
    if (Array.isArray(visibleColumns) && visibleColumns.length !== context.sharedService.visibleColumns.length) {
      context.sharedService.visibleColumns = visibleColumns;
    }

    // when using row selection, SlickGrid will only apply the "selected" CSS class on the visible columns only
    // and if the row selection was done prior to the column being shown then that column that was previously hidden (at the time of the row selection)
    // will not have the "selected" CSS class because it wasn't visible at the time.
    // To bypass this problem we can simply recall the row selection with the same selection and that will trigger a re-apply of the CSS class
    // on all columns including the column we just made visible
    if (context.gridOptions.enableRowSelection && isChecked) {
      const rowSelection = context.grid.getSelectedRows();
      context.grid.setSelectedRows(rowSelection);
    }

    // if we're using frozen columns, we need to readjust pinning when the new hidden column becomes visible again on the left pinning container
    // we need to readjust frozenColumn index because SlickGrid freezes by index and has no knowledge of the columns themselves
    const frozenColumnIndex = context.gridOptions.frozenColumn ?? -1;
    if (frozenColumnIndex >= 0) {
      context.extensionUtility.readjustFrozenColumnIndexWhenNeeded(frozenColumnIndex, context.columns, visibleColumns);
    }

    const callbackArgs = {
      columnId,
      showing: isChecked,
      allColumns: context.columns,
      visibleColumns,
      columns: visibleColumns,
      grid: context.grid
    };

    // execute user callback when defined
    context.pubSubService.publish(`${controlType}:onColumnsChanged`, callbackArgs);
    if (typeof context.addonOptions?.onColumnsChanged === 'function') {
      context.addonOptions.onColumnsChanged(event, callbackArgs);
    }
  }
}

export function populateColumnPicker(this: ColumnPickerControl | GridMenuControl, addonOptions: ColumnPickerOption | GridMenuOption) {
  const context: any = this;
  const menuPrefix = context instanceof GridMenuControl ? 'gridmenu-' : '';

  for (const column of context.columns) {
    const columnId = column.id;
    const columnLiElm = document.createElement('li');
    columnLiElm.className = column.excludeFromColumnPicker ? 'hidden' : '';

    const colInputElm = document.createElement('input');
    colInputElm.type = 'checkbox';
    colInputElm.id = `${context._gridUid}-${menuPrefix}colpicker-${columnId}`;
    colInputElm.dataset.columnid = `${columnId}`;
    const colIndex = context.grid.getColumnIndex(columnId);
    if (colIndex >= 0) {
      colInputElm.checked = true;
    }
    columnLiElm.appendChild(colInputElm);
    context._columnCheckboxes.push(colInputElm);

    const headerColumnValueExtractorFn = typeof addonOptions?.headerColumnValueExtractor === 'function' ? addonOptions.headerColumnValueExtractor : context._defaults.headerColumnValueExtractor;
    const columnLabel = headerColumnValueExtractorFn!(column, context.gridOptions);

    const labelElm = document.createElement('label');
    labelElm.htmlFor = `${context._gridUid}-${menuPrefix}colpicker-${columnId}`;
    labelElm.innerHTML = sanitizeTextByAvailableSanitizer(context.gridOptions, columnLabel);
    columnLiElm.appendChild(labelElm);
    context._listElm.appendChild(columnLiElm);
  }

  if (!addonOptions.hideForceFitButton || !addonOptions.hideSyncResizeButton) {
    context._listElm.appendChild(document.createElement('hr'));
  }

  if (!(addonOptions?.hideForceFitButton)) {
    const forceFitTitle = addonOptions?.forceFitTitle;

    const fitInputElm = document.createElement('input');
    fitInputElm.type = 'checkbox';
    fitInputElm.id = `${context._gridUid}-${menuPrefix}colpicker-forcefit`;
    fitInputElm.dataset.option = 'autoresize';

    const labelElm = document.createElement('label');
    labelElm.htmlFor = `${context._gridUid}-${menuPrefix}colpicker-forcefit`;
    labelElm.textContent = forceFitTitle ?? '';
    if (context.gridOptions.forceFitColumns) {
      fitInputElm.checked = true;
    }

    const fitLiElm = document.createElement('li');
    fitLiElm.appendChild(fitInputElm);
    fitLiElm.appendChild(labelElm);
    context._listElm.appendChild(fitLiElm);
  }

  if (!(addonOptions?.hideSyncResizeButton)) {
    const syncResizeTitle = (addonOptions?.syncResizeTitle) || addonOptions.syncResizeTitle;
    const labelElm = document.createElement('label');
    labelElm.htmlFor = `${context._gridUid}-${menuPrefix}colpicker-syncresize`;
    labelElm.textContent = syncResizeTitle ?? '';

    const syncInputElm = document.createElement('input');
    syncInputElm.type = 'checkbox';
    syncInputElm.id = `${context._gridUid}-${menuPrefix}colpicker-syncresize`;
    syncInputElm.dataset.option = 'syncresize';
    if (context.gridOptions.syncColumnCellResize) {
      syncInputElm.checked = true;
    }

    const syncLiElm = document.createElement('li');
    syncLiElm.appendChild(syncInputElm);
    syncLiElm.appendChild(labelElm);
    context._listElm.appendChild(syncLiElm);
  }
}

/**
 * Because columns can be reordered, we have to update the `columns` to reflect the new order, however we can't just take `grid.getColumns()`,
 * as it does not include columns currently hidden by the picker. We create a new `columns` structure by leaving currently-hidden
 * columns in their original ordinal position and interleaving the results of the current column sort.
 */
export function updateColumnPickerOrder(this: ColumnPickerControl | GridMenuControl) {
  const context: any = this;

  const current = context.grid.getColumns().slice(0);
  const ordered = new Array(context.columns.length);

  for (let i = 0; i < ordered.length; i++) {
    const columnIdx = context.grid.getColumnIndex(context.columns[i].id);
    if (columnIdx === undefined) {
      // if the column doesn't return a value from getColumnIndex, it is hidden. Leave it in this position.
      ordered[i] = context.columns[i];
    } else {
      // otherwise, grab the next visible column.
      ordered[i] = current.shift();
    }
  }

  // the new set of ordered columns becomes the new set of column picker columns
  context._columns = ordered;
}